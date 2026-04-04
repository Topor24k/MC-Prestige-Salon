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

  const openTodaysModal = () => {
    if (!todaysModal) {
      return;
    }
    todaysModal.classList.add('is-open');
    todaysModal.setAttribute('aria-hidden', 'false');
    syncBodyModalState();
  };

  const closeTodaysModal = () => {
    if (!todaysModal) {
      return;
    }
    todaysModal.classList.remove('is-open');
    todaysModal.setAttribute('aria-hidden', 'true');
    syncBodyModalState();
  };

  const openCompletedModal = () => {
    if (!completedModal) {
      return;
    }
    completedModal.classList.add('is-open');
    completedModal.setAttribute('aria-hidden', 'false');
    syncBodyModalState();
  };

  const closeCompletedModal = () => {
    if (!completedModal) {
      return;
    }
    completedModal.classList.remove('is-open');
    completedModal.setAttribute('aria-hidden', 'true');
    syncBodyModalState();
  };

  if (todaysCard) {
    todaysCard.addEventListener('click', openTodaysModal);
    todaysCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openTodaysModal();
      }
    });
  }

  if (todaysModalClose) {
    todaysModalClose.addEventListener('click', closeTodaysModal);
  }

  if (completedCard) {
    completedCard.addEventListener('click', openCompletedModal);
    completedCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCompletedModal();
      }
    });
  }

  if (completedModalClose) {
    completedModalClose.addEventListener('click', closeCompletedModal);
  }

  if (todaysModal) {
    todaysModal.addEventListener('click', (event) => {
      if (event.target === todaysModal) {
        closeTodaysModal();
      }
    });
  }

  if (completedModal) {
    completedModal.addEventListener('click', (event) => {
      if (event.target === completedModal) {
        closeCompletedModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && todaysModal?.classList.contains('is-open')) {
      closeTodaysModal();
      return;
    }

    if (event.key === 'Escape' && completedModal?.classList.contains('is-open')) {
      closeCompletedModal();
    }
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
