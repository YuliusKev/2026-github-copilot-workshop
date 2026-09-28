<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Create Purchase Order</h2>
          <p class="muted">Create PO by allocating lines from approved requisitions</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <form @submit.prevent="handleSubmit">
      <!-- PO Header -->
      <POHeaderForm v-model="headerForm" :approved-prs="approvedPrs" />

      <!-- Line Allocations -->
      <POLineAllocationTable ref="tableRef" v-model="allocations" />

      <!-- Action buttons -->
      <div class="btn-group">
        <RouterLink to="/purchase-orders" class="btn btn-outline">Cancel</RouterLink>
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating...' : 'Create PO' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import POHeaderForm from '../components/POHeaderForm.vue';
import POLineAllocationTable from '../components/POLineAllocationTable.vue';
import { api } from '../api';

const router = useRouter();
const tableRef = ref(null);
const errorMessage = ref('');
const isSubmitting = ref(false);

const approvedPrs = ref([]);

const headerForm = reactive({
  selectedPrId: null,
  supplierName: '',
  poTitle: '',
  deliveryDate: '',
  deliveryAddress: '',
  notes: '',
});

const allocations = ref([]);

onMounted(async () => {
  try {
    const { items } = await api.listRequisitions();
    approvedPrs.value = (items || []).filter((pr) => pr.status === 'APPROVED');
  } catch (error) {
    errorMessage.value = error.message;
  }
});

// Watch PR selection to load its open lines for allocation
watch(
  () => headerForm.selectedPrId,
  async (newPrId) => {
    errorMessage.value = '';
    if (!newPrId) {
      allocations.value = [];
      return;
    }

    try {
      const { openLines } = await api.getRequisitionOpenLines(newPrId);
      allocations.value = (openLines || []).map((line) => ({
        prLineId: line.id,
        description: `${line.itemCode} - ${line.itemName}`,
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        requiredDate: line.requiredDate,
        unitPrice: line.estUnitPrice,
        remainingQty: line.qtyOpenForPo,
        allocatedQty: 0,
      }));
    } catch (error) {
      allocations.value = [];
      errorMessage.value = error.message;
    }
  }
);

async function handleSubmit() {
  errorMessage.value = '';

  // Validate form fields
  if (!headerForm.selectedPrId) {
    errorMessage.value = 'Please select a Purchase Requisition';
    return;
  }

  if (!headerForm.supplierName.trim()) {
    errorMessage.value = 'Supplier name is required';
    return;
  }

  if (allocations.value.length === 0) {
    errorMessage.value = 'Please select a PR with lines to allocate';
    return;
  }

  // Client-side validation (mirrors server-side over-allocation guard)
  const validation = tableRef.value.validateAllocations();
  if (!validation.valid) {
    errorMessage.value = 'Please fix the allocation errors below';
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      vendorName: headerForm.supplierName.trim(),
      lines: allocations.value.map((line) => ({
        prLineId: line.prLineId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        qtyOrdered: line.allocatedQty,
        unitPrice: line.unitPrice,
        requiredDate: line.requiredDate || undefined,
      })),
    };

    const created = await api.createPurchaseOrder(payload);
    await router.push(`/purchase-orders/${created.id}`);
  } catch (error) {
    // Surfaces server-side 422 rule violations (e.g. over-allocation) with their exact message
    errorMessage.value = error.message;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
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
  background: var(--bg);
}
</style>
