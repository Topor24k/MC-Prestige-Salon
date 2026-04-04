const addEntryButton = document.getElementById('add-entry-btn');
const entryModal = document.getElementById('entry-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const closeEntryButton = document.getElementById('close-entry-modal');
const cancelEntryButton = document.getElementById('cancel-entry-btn');
const saveEntryButton = document.getElementById('save-entry-btn');
const confirmationEditButton = document.getElementById('confirmation-edit-btn');
const confirmationConfirmButton = document.getElementById('confirmation-confirm-btn');
const tabButtons = document.querySelectorAll('.entry-tab');
const transactionsTableBody = document.querySelector('.table-card tbody');
const entryModalTitle = document.getElementById('entry-modal-title');
const entryPanelHead = document.getElementById('entry-panel-head');
const entryServiceLabel = document.getElementById('entry-service-label');
const entryAmountLabel = document.getElementById('entry-amount-label');
const entryServiceSelect = document.getElementById('entry-service');
const entryAmountInput = document.getElementById('entry-amount');
const confirmationDateText = document.getElementById('confirmation-date-text');
const confirmationList = document.getElementById('confirmation-list');
const summaryTotalExpense = document.getElementById('summary-total-expense');
const summaryGrossSale = document.getElementById('summary-gross-sale');
const summaryNetSales = document.getElementById('summary-net-sales');
const dateField = document.getElementById('entry-date');

const formState = {
  credit: null,
  debit: null
};

let editingRow = null;

const modalModes = {
  credit: {
    title: 'Add New Entry',
    panelHead: 'Add Service',
    serviceLabel: 'Service',
    amountLabel: 'Amount',
    amountPlaceholder: 'Service Amount',
    defaultService: 'Hair',
    options: ['Hair', 'Nails', 'KOS', 'Hair Color', 'Treatment']
  },
  debit: {
    title: 'Add New Entry',
    panelHead: 'Add Expense',
    serviceLabel: 'Expense',
    amountLabel: 'Amount',
    amountPlaceholder: 'Expense Amount',
    defaultService: 'Cleaning Materials',
    options: ['Cleaning Materials', 'Utilities', 'Supplies', 'Rent', 'Other']
  }
};

function syncBodyLock() {
  const anyModalOpen = entryModal?.classList.contains('is-open') || confirmationModal?.classList.contains('is-open');
  document.body.classList.toggle('modal-open', Boolean(anyModalOpen));
}

function formatCurrency(amount) {
  return `₱${amount.toFixed(2)}`;
}

function formatReadableDate(isoDate) {
  if (!isoDate) {
    return 'No date selected';
  }
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseAmount(value) {
  const numeric = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function toIsoDateFromTableDate(value) {
  const match = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }
  const [, month, day, yearShort] = match;
  return `20${yearShort}-${month}-${day}`;
}

function toTableDateFromIso(isoDate) {
  if (!isoDate) {
    return '';
  }
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${month}-${day}-${year.slice(-2)}`;
}

function getDateValueOrToday() {
  if (dateField?.value) {
    return dateField.value;
  }
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function setDateToToday() {
  if (dateField) {
    dateField.value = getDateValueOrToday();
  }
}

function extractRowEntry(row, mode) {
  const cells = row.querySelectorAll('td');
  const serviceIndex = mode === 'credit' ? 1 : 3;
  const amountIndex = mode === 'credit' ? 2 : 4;
  const fallbackService = mode === 'credit' ? 'Hair' : 'Cleaning Materials';
  const serviceCell = cells[serviceIndex];
  const serviceName = serviceCell?.querySelector('.credit-name')?.textContent?.trim() || fallbackService;
  const amountText = cells[amountIndex]?.textContent?.trim() || '0';

  return {
    mode,
    service: serviceName,
    amount: parseAmount(amountText)
  };
}

function hydrateStateFromRow(row) {
  const cells = row.querySelectorAll('td');
  const dateText = cells[0]?.textContent?.trim() || '';
  const isoDate = toIsoDateFromTableDate(dateText);

  formState.credit = extractRowEntry(row, 'credit');
  formState.debit = extractRowEntry(row, 'debit');

  if (dateField) {
    dateField.value = isoDate || getDateValueOrToday();
  }
}

function updateRowWithFormState(row) {
  const cells = row.querySelectorAll('td');
  if (cells.length < 7) {
    return;
  }

  const credit = formState.credit || { service: 'Hair', amount: 0, mode: 'credit' };
  const debit = formState.debit || { service: 'Cleaning Materials', amount: 0, mode: 'debit' };
  const gross = credit.amount;
  const expense = debit.amount;
  const net = gross - expense;

  cells[0].textContent = toTableDateFromIso(getDateValueOrToday());
  cells[1].classList.add('credit-cell');
  cells[1].innerHTML = `<div class="credit-row"><span class="credit-name">${credit.service}</span><span class="credit-dash">-</span><span>${formatCurrency(credit.amount)}</span></div>`;
  cells[2].textContent = formatCurrency(gross);

  cells[3].classList.add('credit-cell');
  cells[3].innerHTML = `<div class="credit-row"><span class="credit-name">${debit.service}</span><span class="credit-dash">-</span><span>${formatCurrency(debit.amount)}</span></div>`;
  cells[4].textContent = formatCurrency(expense);
  cells[5].textContent = formatCurrency(net);
}

function clearFormState() {
  formState.credit = null;
  formState.debit = null;
}

function populateSelectOptions(options, preferredValue) {
  if (!entryServiceSelect) {
    return;
  }

  entryServiceSelect.innerHTML = '';
  options.forEach((optionText) => {
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    entryServiceSelect.appendChild(option);
  });

  entryServiceSelect.value = preferredValue || options[0];
}

function updateModalMode(mode) {
  const config = modalModes[mode] ?? modalModes.credit;

  if (entryModalTitle) {
    entryModalTitle.textContent = config.title;
  }

  if (entryPanelHead) {
    entryPanelHead.querySelector('span').textContent = config.panelHead;
  }

  if (entryServiceLabel) {
    entryServiceLabel.textContent = config.serviceLabel;
  }

  if (entryAmountLabel) {
    entryAmountLabel.textContent = config.amountLabel;
  }

  if (entryAmountInput) {
    entryAmountInput.placeholder = config.amountPlaceholder;
  }

  if (entryServiceSelect) {
    populateSelectOptions(config.options, formState[mode]?.service || config.defaultService);
  }

  if (entryAmountInput) {
    const stateAmount = formState[mode]?.amount;
    entryAmountInput.value = Number.isFinite(stateAmount) && stateAmount > 0 ? stateAmount.toFixed(2) : '';
  }

  tabButtons.forEach((tabButton) => {
    const tabMode = tabButton.dataset.mode;
    tabButton.classList.toggle('active', tabMode === mode);
  });

  entryModal?.setAttribute('data-mode', mode);
}

function openEntryModal() {
  entryModal.classList.add('is-open');
  entryModal.setAttribute('aria-hidden', 'false');
  updateModalMode('credit');
  syncBodyLock();
}

function closeEntryModal() {
  entryModal.classList.remove('is-open');
  entryModal.setAttribute('aria-hidden', 'true');
  syncBodyLock();
}

function openConfirmationModal() {
  confirmationModal?.classList.add('is-open');
  confirmationModal?.setAttribute('aria-hidden', 'false');
  syncBodyLock();
}

function closeConfirmationModal() {
  confirmationModal?.classList.remove('is-open');
  confirmationModal?.setAttribute('aria-hidden', 'true');
  syncBodyLock();
}

function setActiveTab(button) {
  const mode = button.dataset.mode || 'credit';
  updateModalMode(mode);
}

function renderConfirmation() {
  if (!confirmationList) {
    return;
  }

  const rows = [formState.credit, formState.debit].filter(Boolean);
  confirmationList.innerHTML = '';

  rows.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'confirmation-row';

    const service = document.createElement('span');
    service.textContent = entry.service;

    const type = document.createElement('span');
    type.textContent = entry.mode === 'credit' ? 'Credit' : 'Debit';

    const amount = document.createElement('span');
    amount.className = entry.mode === 'credit' ? 'amount-positive' : 'amount-negative';
    amount.textContent = `${entry.mode === 'credit' ? '+' : '-'} ${formatCurrency(entry.amount)}`;

    row.append(service, type, amount);
    confirmationList.appendChild(row);
  });

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'confirmation-empty';
    empty.textContent = 'No transaction entries captured.';
    confirmationList.appendChild(empty);
  }

  const grossSale = (formState.credit?.amount || 0);
  const totalExpense = (formState.debit?.amount || 0);
  const netSales = grossSale - totalExpense;

  if (summaryGrossSale) {
    summaryGrossSale.textContent = formatCurrency(grossSale);
  }
  if (summaryTotalExpense) {
    summaryTotalExpense.textContent = formatCurrency(totalExpense);
  }
  if (summaryNetSales) {
    summaryNetSales.textContent = formatCurrency(netSales);
  }

  if (confirmationDateText) {
    confirmationDateText.textContent = formatReadableDate(dateField?.value);
  }
}

function saveCurrentEntry() {
  const mode = entryModal?.getAttribute('data-mode') || 'credit';
  const service = entryServiceSelect?.value || (mode === 'credit' ? 'Hair' : 'Cleaning Materials');
  const amount = parseAmount(entryAmountInput?.value || '0');

  formState[mode] = { mode, service, amount };

  if (mode === 'credit') {
    updateModalMode('debit');
    return;
  }

  closeEntryModal();
  renderConfirmation();
  openConfirmationModal();
}

function resetState() {
  clearFormState();
  editingRow = null;
  if (entryAmountInput) {
    entryAmountInput.value = '';
  }
}

function openEntryModalForNew() {
  editingRow = null;
  clearFormState();
  setDateToToday();
  openEntryModal();
}

function openEntryModalForEdit(row) {
  editingRow = row;
  hydrateStateFromRow(row);
  openEntryModal();
}

if (addEntryButton && entryModal) {
  addEntryButton.addEventListener('click', openEntryModalForNew);
}

if (closeEntryButton) {
  closeEntryButton.addEventListener('click', closeEntryModal);
}

if (cancelEntryButton) {
  cancelEntryButton.addEventListener('click', closeEntryModal);
}

if (saveEntryButton) {
  saveEntryButton.addEventListener('click', saveCurrentEntry);
}

if (confirmationEditButton) {
  confirmationEditButton.addEventListener('click', () => {
    closeConfirmationModal();
    entryModal.classList.add('is-open');
    entryModal.setAttribute('aria-hidden', 'false');
    updateModalMode('debit');
    syncBodyLock();
  });
}

if (confirmationConfirmButton) {
  confirmationConfirmButton.addEventListener('click', () => {
    if (editingRow) {
      updateRowWithFormState(editingRow);
    }
    closeConfirmationModal();
    resetState();
  });
}

if (transactionsTableBody) {
  transactionsTableBody.addEventListener('click', (event) => {
    const actionButton = event.target.closest('.row-action-btn');
    if (!actionButton) {
      return;
    }

    const row = actionButton.closest('tr');
    if (!row) {
      return;
    }

    if (actionButton.classList.contains('delete')) {
      row.remove();
      return;
    }

    if (actionButton.classList.contains('edit')) {
      openEntryModalForEdit(row);
    }
  });
}

if (entryModal) {
  entryModal.addEventListener('click', (event) => {
    if (event.target === entryModal) {
      closeEntryModal();
    }
  });
}

if (confirmationModal) {
  confirmationModal.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
      closeConfirmationModal();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && confirmationModal?.classList.contains('is-open')) {
    closeConfirmationModal();
    return;
  }

  if (event.key === 'Escape' && entryModal?.classList.contains('is-open')) {
    closeEntryModal();
  }
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button));
});

updateModalMode('credit');

if (dateField && !dateField.value) {
  setDateToToday();
}
