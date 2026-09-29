<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Create Goods Receipt</h2>
          <p class="muted">Receive items against a submitted purchase order</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <!-- GR Header -->
      <div class="card-panel">
        <p class="form-section-title">GR Header</p>
        <div class="form-row">
          <div class="form-group">
            <label>Purchase Order *</label>
            <select v-model="selectedPoId" required>
              <option value="">-- Select PO --</option>
              <option v-for="po in submittedPos" :key="po.id" :value="po.id">
                {{ po.poNumber }} - {{ po.vendorName }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Receipt Date</label>
            <input v-model="receiptDate" type="date" />
          </div>
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="notes" placeholder="Type..." rows="3" />
        </div>
      </div>

      <!-- Line Receipts -->
      <GRLineReceiptTable ref="tableRef" v-model="receiptLines" />

      <!-- Action buttons -->
      <div class="btn-group">
        <RouterLink to="/goods-receipts" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating...' : 'Create GR' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import GRLineReceiptTable from '../components/GRLineReceiptTable.vue';
import { api } from '../api';

const route = useRoute();
const router = useRouter();
const tableRef = ref(null);
const errorMessage = ref('');
const isSubmitting = ref(false);

const submittedPos = ref([]);
const selectedPoId = ref(route.query.poId || '');
const receiptDate = ref('');
const notes = ref('');
const receiptLines = ref([]);

onMounted(async () => {
  try {
    const { items } = await api.listPurchaseOrders();
    submittedPos.value = (items || []).filter((po) => po.status === 'SUBMITTED');
  } catch (error) {
    errorMessage.value = error.message;
  }
});

// Watch PO selection to load its open lines for receipt
watch(
  selectedPoId,
  async (newPoId) => {
    errorMessage.value = '';
    if (!newPoId) {
      receiptLines.value = [];
      return;
    }

    try {
      const { openLines } = await api.getOpenPoLines(newPoId);
      receiptLines.value = (openLines || []).map((line) => ({
        poLineId: line.id,
        description: `${line.itemCode} - ${line.itemName}`,
        uom: line.uom,
        openQty: line.qtyOpenForGr,
        qtyReceived: 0,
        actualSiteCode: line.siteCode || '',
      }));
    } catch (error) {
      receiptLines.value = [];
      errorMessage.value = error.message;
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  errorMessage.value = '';

  if (!selectedPoId.value) {
    errorMessage.value = 'Please select a Purchase Order';
    return;
  }

  if (receiptLines.value.length === 0) {
    errorMessage.value = 'Please select a PO with open lines to receive';
    return;
  }

  // Client-side validation (mirrors server-side over-receipt guard)
  const validation = tableRef.value.validateLines();
  if (!validation.valid) {
    errorMessage.value = 'Please fix the receipt errors below';
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      poId: selectedPoId.value,
      receiptDate: receiptDate.value || undefined,
      notes: notes.value.trim() || undefined,
      lines: receiptLines.value.map((line) => ({
        poLineId: line.poLineId,
        qtyReceived: line.qtyReceived,
        actualSiteCode: line.actualSiteCode.trim(),
      })),
    };

    const created = await api.createGoodsReceipt(payload);
    await router.push(`/goods-receipts/${created.id}`);
  } catch (error) {
    // Surfaces server-side 422 rule violations (e.g. over-receipt) with their exact message
    errorMessage.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
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

.error {
  color: #d32f2f;
  background: #ffebee;
  border: 1px solid #d32f2f;
  border-radius: var(--radius-input);
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
}

.btn-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--primary);
  color: var(--white);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: var(--white);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-outline:hover {
  background: var(--table-header);
}
</style>
