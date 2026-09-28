<template>
  <div class="card-panel">
    <div class="card-panel-header">
      <p class="form-section-title" style="margin: 0">Line Allocations</p>
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
          <th style="width: 100px">Unit Price</th>
          <th style="width: 100px">Remaining Qty</th>
          <th style="width: 100px">Allocated Qty *</th>
          <th style="width: 120px">Line Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(allocation, index) in modelValue" :key="index" :class="{ 'row-error': hasError(index) }">
          <td>{{ index + 1 }}</td>
          <td>{{ allocation.description }}</td>
          <td class="text-right">{{ formatPrice(allocation.unitPrice) }}</td>
          <td class="text-right">{{ allocation.remainingQty }}</td>
          <td>
            <input
              v-model.number="allocation.allocatedQty"
              @input="() => emitUpdate()"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              class="qty-input"
              :class="{ 'input-error': hasQtyError(index) }"
            />
          </td>
          <td class="text-right">{{ formatPrice(allocation.unitPrice * allocation.allocatedQty) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty-message">No lines to allocate. Select a PR first.</p>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

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
  const allocation = props.modelValue[index];
  if (!allocation) return false;
  return allocation.allocatedQty <= 0 || allocation.allocatedQty > allocation.remainingQty;
}

function hasError(index) {
  return hasQtyError(index);
}

function validateAllocations() {
  validationErrors.value = [];
  const errors = [];

  props.modelValue.forEach((allocation, index) => {
    if (!allocation.allocatedQty || allocation.allocatedQty <= 0) {
      errors.push(`Line ${index + 1}: Allocated quantity must be greater than 0`);
    }
    if (allocation.allocatedQty > allocation.remainingQty) {
      errors.push(
        `Line ${index + 1}: Allocated quantity (${allocation.allocatedQty}) exceeds remaining quantity (${allocation.remainingQty})`
      );
    }
  });

  validationErrors.value = errors;
  return { valid: errors.length === 0, errors };
}

function formatPrice(value) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00';
}

defineExpose({
  validateAllocations,
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
