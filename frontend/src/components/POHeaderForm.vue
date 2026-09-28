<template>
  <div class="card-panel">
    <p class="form-section-title">PO Header</p>
    <div class="form-row">
      <div class="form-group">
        <label>Purchase Requisition *</label>
        <select v-model="localValue.selectedPrId" @change="emitUpdate" required>
          <option value="">-- Select PR --</option>
          <option v-for="pr in approvedPrs" :key="pr.id" :value="pr.id">
            {{ pr.id }} - {{ pr.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Supplier Name *</label>
        <input v-model="localValue.supplierName" @input="emitUpdate" placeholder="Type..." required />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>PO Title</label>
        <input v-model="localValue.poTitle" @input="emitUpdate" placeholder="Type..." />
      </div>
      <div class="form-group">
        <label>Delivery Date</label>
        <input v-model="localValue.deliveryDate" @input="emitUpdate" type="date" />
      </div>
    </div>
    <div class="form-group full">
      <label>Delivery Address</label>
      <input v-model="localValue.deliveryAddress" @input="emitUpdate" placeholder="Type..." />
    </div>
    <div class="form-group full">
      <label>Notes</label>
      <textarea v-model="localValue.notes" @input="emitUpdate" placeholder="Type..." rows="3" />
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      selectedPrId: null,
      supplierName: '',
      poTitle: '',
      deliveryDate: '',
      deliveryAddress: '',
      notes: '',
    }),
  },
  approvedPrs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const localValue = reactive({ ...props.modelValue });

watch(
  () => props.modelValue,
  (newVal) => {
    Object.assign(localValue, newVal);
  },
  { deep: true }
);

function emitUpdate() {
  emit('update:modelValue', { ...localValue });
}
</script>

<style scoped>
.form-section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--white);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(255, 64, 129, 0.1);
}

.form-group textarea {
  resize: vertical;
}
</style>
