<script>
  import { saveCard, deleteCard, getCards } from "./lib/db.js";
  import { generatePDF } from "./lib/pdfGenerator.js";

  // Données de la carte
  let cardData = {
    title: "M.",
    firstName: "",
    lastName: "",
    profession: "",
    address: "",
    email: "",
    phone: "",
    template: "modern",
    logoUrl: "",
    qrCodeUrl: "",
    createdAt: null,
  };

  // États de l'application
  let cards = [];
  let searchTerm = "";
  let errors = {};
  let previewUrl = "";
  let isLoading = false;
  let activeTab = "edit";

  // Options disponibles
  const titles = ["M.", "Mme", "Mlle", "Dr", "Me", "Pr"];
  const templates = [
    { id: "classic", name: "Classique" },
    { id: "modern", name: "Moderne" },
    { id: "minimal", name: "Minimaliste" },
    { id: "professional", name: "Professionnel" },
    { id: "custom", name: "Personnalisé" },
  ];

  // Chargement initial
  loadCards();

  async function loadCards() {
    isLoading = true;
    try {
      cards = await getCards();
    } finally {
      isLoading = false;
    }
  }

  function generateQRCode(email) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mailto:${encodeURIComponent(email)}`;
  }

  function updatePreview() {
    if (!cardData.email) return;
    cardData.qrCodeUrl = generateQRCode(cardData.email);
    const doc = generatePDF(cardData, cardData.template);
    previewUrl = doc.output("dataurlstring");
  }

  function validate() {
    errors = {};
    if (!cardData.firstName.trim()) errors.firstName = "Prénom requis";
    if (!cardData.lastName.trim()) errors.lastName = "Nom requis";
    if (!cardData.email.trim()) errors.email = "Email requis";
    if (cardData.email && !/^\S+@\S+\.\S+$/.test(cardData.email))
      errors.email = "Email invalide";
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (!validate()) return;

    isLoading = true;
    try {
      cardData.createdAt = cardData.createdAt || new Date().toISOString();
      await saveCard(cardData);
      updatePreview();
      await loadCards();
      activeTab = "preview";
    } finally {
      isLoading = false;
    }
  }

  async function deleteCurrentCard() {
    if (!cardData.id) return;
    if (confirm("Supprimer cette carte définitivement ?")) {
      await deleteCard(cardData.id);
      cardData = { ...cardData, id: null }; // Réinitialise sans perdre les valeurs par défaut
      await loadCards();
    }
  }

  function editCard(card) {
    cardData = {
      title: "M.",
      firstName: "",
      lastName: "",
      profession: "",
      address: "",
      email: "",
      template: "modern",
      logoUrl: "",
      qrCodeUrl: "",
      createdAt: null,
      ...card,
    };
    activeTab = "edit";
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      cardData.logoUrl = String(reader.result);
    };

    reader.readAsDataURL(file);
  }
</script>

<div class="app-container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>Mes Cartes</h2>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Rechercher..."
        class="search-input"
      />
    </div>

    <div class="cards-list">
      {#if isLoading && cards.length === 0}
        <div class="loading">Chargement...</div>
      {:else if cards.length === 0}
        <div class="empty-state">Aucune carte enregistrée</div>
      {:else}
        {#each cards.filter( (c) => `${c.firstName} ${c.lastName} ${c.profession}`
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ) as card}
          <div
            class="card-item"
            role="button"
            tabindex="0"
            on:click={() => editCard(card)}
            on:keydown={(e) => e.key === "Enter" && editCard(card)}
          >
            <div class="card-info">
              <h3>{card.title} {card.firstName} {card.lastName}</h3>
              <p>{card.profession}</p>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <button on:click={() => editCard({})} class="new-card-btn">
      + Nouvelle Carte
    </button>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <div class="tabs">
      <button
        class:active={activeTab === "edit"}
        on:click={() => (activeTab = "edit")}
      >
        Édition
      </button>
      <button
        class:active={activeTab === "preview"}
        on:click={() => updatePreview()}
        disabled={!cardData.email}
      >
        Prévisualisation
      </button>
    </div>

    {#if activeTab === "edit"}
      <div class="editor">
        <form on:submit|preventDefault={save}>
          <div class="form-grid">
            <!-- Row 1 -->
            <div class="form-group">
              <label for="title">Titre</label>
              <select id="title" bind:value={cardData.title}>
                {#each titles as title}
                  <option value={title}>{title}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="firstName">Prénom</label>
              <input
                id="firstName"
                type="text"
                bind:value={cardData.firstName}
                class={errors.firstName ? "error" : ""}
              />
              {#if errors.firstName}
                <span class="error-message">{errors.firstName}</span>
              {/if}
            </div>

            <div class="form-group">
              <label for="lastName">Nom</label>
              <input
                id="lastName"
                type="text"
                bind:value={cardData.lastName}
                class={errors.lastName ? "error" : ""}
              />
              {#if errors.lastName}
                <span class="error-message">{errors.lastName}</span>
              {/if}
            </div>

            <!-- Row 2 -->
            <div class="form-group">
              <label for="profession">Profession</label>
              <input
                id="profession"
                type="text"
                bind:value={cardData.profession}
              />
            </div>
            <div class="form-group">
              <label for="phone">Téléphone</label>
              <input
                id="phone"
                type="text"
                bind:value={cardData.phone}
                placeholder="Ex: +33 6 12 34 56 78"
              />
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                bind:value={cardData.email}
                class={errors.email ? "error" : ""}
              />
              {#if errors.email}
                <span class="error-message">{errors.email}</span>
              {/if}
            </div>

            <!-- Row 3 -->
            <div class="form-group span-2">
              <label for="address">Adresse</label>
              <textarea id="address" bind:value={cardData.address} rows="3"
              ></textarea>
            </div>

            <!-- Row 4 -->
            <div class="form-group">
              <label for="template">Modèle</label>
              <div id="template" class="template-options">
                {#each templates as tpl}
                  <label>
                    <input
                      type="radio"
                      bind:group={cardData.template}
                      value={tpl.id}
                      name="template"
                    />
                    {tpl.name}
                  </label>
                {/each}
              </div>
            </div>

            <div class="form-group">
              <label for="logo">Logo</label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                on:change={handleLogoUpload}
              />
              {#if cardData.logoUrl}
                <img src={cardData.logoUrl} alt="Logo" class="logo-preview" />
              {/if}
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </button>
            {#if cardData.id}
              <button
                type="button"
                on:click={deleteCurrentCard}
                class="delete-btn"
              >
                Supprimer
              </button>
            {/if}
          </div>
        </form>
      </div>
    {:else}
      <div class="preview-container">
        {#if previewUrl}
          <iframe
            src={previewUrl}
            class="pdf-preview"
            title="Aperçu de la carte de visite"
          ></iframe>
          <a
            href={previewUrl}
            download={`carte_${cardData.lastName || "visite"}.pdf`}
            class="download-btn"
          >
            Télécharger PDF
          </a>
        {:else}
          <div class="preview-placeholder">
            <p>Générez un aperçu après avoir saisi votre email</p>
            <button on:click={() => (activeTab = "edit")}>
              Retour à l'édition
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  /* Variables CSS */
  :root {
    --primary: #4caf50;
    --primary-dark: #388e3c;
    --secondary: #2196f3;
    --danger: #f44336;
    --text: #333;
    --text-light: #666;
    --border: #e0e0e0;
    --background: #f5f5f5;
    --card-bg: #fff;
    --sidebar-bg: #f8f9fa;
  }

  /* Reset et base */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Layout principal */
  .app-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
  }

  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .cards-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .card-item {
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: var(--card-bg);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid transparent;
  }

  .card-item:hover {
    background: #f0f0f0;
  }

  .card-info h3 {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }

  .card-info p {
    font-size: 0.85rem;
    color: var(--text-light);
  }

  .new-card-btn {
    margin: 1rem;
    padding: 0.75rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .new-card-btn:hover {
    background: var(--primary-dark);
  }

  /* Contenu principal */
  .main-content {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  /* Tabs */
  .tabs {
    display: flex;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .tabs button {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    font-weight: 500;
    color: var(--text-light);
  }

  .tabs button.active {
    color: var(--primary);
  }

  .tabs button.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--primary);
  }

  /* Formulaire */
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group.span-2 {
    grid-column: span 2;
  }

  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text);
  }

  input,
  select,
  textarea {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 1rem;
  }

  .error {
    border-color: var(--danger);
  }

  .error-message {
    color: var(--danger);
    font-size: 0.8rem;
  }

  .template-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .template-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    cursor: pointer;
  }

  .logo-preview {
    max-width: 100px;
    max-height: 100px;
    margin-top: 0.5rem;
    border-radius: 4px;
  }

  /* Actions */
  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  button:hover {
    background: var(--primary-dark);
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .delete-btn {
    background: var(--danger);
  }

  .delete-btn:hover {
    background: #d32f2f;
  }

  /* Prévisualisation */
  .preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 0;
  }

  .pdf-preview {
    width: 100%;
    height: 400px;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .download-btn {
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .preview-placeholder {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  /* États */
  .loading,
  .empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--text-light);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .app-container {
      grid-template-columns: 1fr;
    }

    .sidebar {
      height: auto;
      position: static;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }

    .cards-list {
      max-height: 300px;
    }

    .main-content {
      padding: 1.5rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.span-2 {
      grid-column: span 1;
    }
  }
</style>
