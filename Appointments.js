document.addEventListener('DOMContentLoaded', () => {
  const todaysCard = document.getElementById('todays-appointments-card');
  const todaysModal = document.getElementById('todays-appointments-modal');
  const todaysModalClose = document.getElementById('todays-modal-close');
  const completedCard = document.getElementById('completed-appointments-card');
  const completedModal = document.getElementById('completed-appointments-modal');
  const completedModalClose = document.getElementById('completed-modal-close');
  const tableBody = document.querySelector('.table-card tbody');

  const syncBodyModalState = () => {
    const isAnyModalOpen = Boolean(
      todaysModal?.classList.contains('is-open') ||
      completedModal?.classList.contains('is-open')
    );
    document.body.classList.toggle('modal-open', isAnyModalOpen);
  };

  const openModal = (modal) => {
    if (!modal) {
      return;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    syncBodyModalState();
  };

  const closeModal = (modal) => {
    if (!modal) {
      return;
    }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    syncBodyModalState();
  };

  const bindModalTriggers = (card, modal, closeButton) => {
    if (card) {
      card.addEventListener('click', () => openModal(modal));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal(modal);
        }
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => closeModal(modal));
    }

    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      });
    }
  };

  bindModalTriggers(todaysCard, todaysModal, todaysModalClose);
  bindModalTriggers(completedCard, completedModal, completedModalClose);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    [todaysModal, completedModal].forEach((modal) => {
      if (modal?.classList.contains('is-open')) {
        closeModal(modal);
      }
    });
  });

  if (!tableBody) {
    return;
  }

  tableBody.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.row-action-btn.delete');
    if (!deleteButton) {
      return;
    }

    const row = deleteButton.closest('tr');
    if (!row) {
      return;
    }

    const customerName = row.cells[0]?.textContent?.trim() || 'this customer';
    const shouldDelete = window.confirm(`Are you sure you want to delete the appointment for ${customerName}?`);
    if (shouldDelete) {
      row.remove();
    }
  });
});
