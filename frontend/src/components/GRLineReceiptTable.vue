<template>
  <div class="card-panel">
    <div class="card-panel-header">
      <p class="form-section-title" style="margin: 0">Line Receipts</p>
    </div>
    <p v-if="validationErrors.length" class="validation-errors">
      <span v-for="(error, idx) in validationErrors" :key="idx">
        {{ error }}<br />
      </span>
    </p>
    <table v-if="modelValue.length > 0">
      <thead>
        <tr>
          <th style="width: 60px">Line</th>
          <th>Description</th>
          <th style="width: 80px">UOM</th>
          <th style="width: 100px">Open Qty</th>
          <th style="width: 100px">Received Qty *</th>
          <th style="width: 140px">Site Code *</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, index) in modelValue" :key="index" :class="{ 'row-error': hasError(index) }">
          <td>{{ index + 1 }}</td>
          <td>{{ line.description }}</td>
          <td>{{ line.uom }}</td>
          <td class="text-right">{{ line.openQty }}</td>
          <td>
            <input
              v-model.number="line.qtyReceived"
              @input="() => emitUpdate()"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              class="qty-input"
              :class="{ 'input-error': hasQtyError(index) }"
            />
          </td>
          <td>
            <input
              v-model="line.actualSiteCode"
              @input="() => emitUpdate()"
              type="text"
              placeholder="Site code"
              class="qty-input"
              :class="{ 'input-error': hasSiteCodeError(index) }"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty-message">No lines to receive. Select a submitted PO first.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const validationErrors = ref([]);

function emitUpdate() {
  emit('update:modelValue', props.modelValue);
}

function hasQtyError(index) {
  const line = props.modelValue[index];
  if (!line) return false;
  return !line.qtyReceived || line.qtyReceived <= 0 || line.qtyReceived > line.openQty;
}

function hasSiteCodeError(index) {
  const line = props.modelValue[index];
  if (!line) return false;
  return !line.actualSiteCode || !line.actualSiteCode.trim();
}

function hasError(index) {
  return hasQtyError(index) || hasSiteCodeError(index);
}

function validateLines() {
  const errors = [];

  props.modelValue.forEach((line, index) => {
    if (!line.qtyReceived || line.qtyReceived <= 0) {
      errors.push(`Line ${index + 1}: Received quantity must be greater than 0`);
    } else if (line.qtyReceived > line.openQty) {
      errors.push(
        `Line ${index + 1}: Received quantity (${line.qtyReceived}) exceeds open quantity (${line.openQty})`
      );
    }
    if (!line.actualSiteCode || !line.actualSiteCode.trim()) {
      errors.push(`Line ${index + 1}: Site code is required`);
    }
  });

  validationErrors.value = errors;
  return { valid: errors.length === 0, errors };
}

defineExpose({
  validateLines,
});
</script>

<style scoped>
.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.validation-errors {
  color: #d32f2f;
  font-size: 13px;
  margin: 12px 0;
  padding: 8px 12px;
  background: #ffebee;
  border-radius: var(--radius-input);
  border-left: 3px solid #d32f2f;
}

.empty-message {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
  border-radius: 10px;
  overflow: hidden;
}

table thead {
  background: var(--table-header);
}

table th {
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

table td {
  padding: 12px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

table tbody tr:last-child td {
  border-bottom: none;
}

table tbody tr:hover {
  background: rgba(255, 64, 129, 0.02);
}

table tbody tr.row-error {
  background: #fff3e0;
}

.text-right {
  text-align: right;
}

.qty-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
}

.qty-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(255, 64, 129, 0.1);
}

.qty-input.input-error {
  border-color: #d32f2f;
  background: #ffebee;
}
</style>
