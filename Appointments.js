document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('.table-card tbody');
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
