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
        <button class="btn btn-primary" type="submit">Create PO</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import POHeaderForm from '../components/POHeaderForm.vue';
import POLineAllocationTable from '../components/POLineAllocationTable.vue';

const router = useRouter();
const tableRef = ref(null);
const errorMessage = ref('');

// Placeholder PR data - replace with API call in next phase
const approvedPrs = ref([
  {
    id: 1,
    title: 'Office Supplies',
    status: 'APPROVED',
    lines: [
      {
        id: 1,
        description: 'Paper A4 500 sheets',
        unitPrice: 5.5,
        remainingQty: 100,
        allocatedQty: 0,
      },
      {
        id: 2,
        description: 'Ink Cartridge Black',
        unitPrice: 25.0,
        remainingQty: 50,
        allocatedQty: 0,
      },
    ],
  },
  {
    id: 2,
    title: 'IT Equipment',
    status: 'APPROVED',
    lines: [
      {
        id: 3,
        description: 'USB Cable Type-C',
        unitPrice: 12.0,
        remainingQty: 200,
        allocatedQty: 0,
      },
    ],
  },
]);

const headerForm = reactive({
  selectedPrId: null,
  supplierName: '',
  poTitle: '',
  deliveryDate: '',
  deliveryAddress: '',
  notes: '',
});

const allocations = ref([]);

// Watch PR selection to populate allocations
import { watch } from 'vue';
watch(
  () => headerForm.selectedPrId,
  (newPrId) => {
    if (newPrId) {
      const selectedPr = approvedPrs.value.find((pr) => pr.id === parseInt(newPrId));
      if (selectedPr) {
        allocations.value = selectedPr.lines.map((line) => ({
          ...line,
          allocatedQty: 0,
        }));
      }
    } else {
      allocations.value = [];
    }
    errorMessage.value = '';
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

  // Validate allocations
  const validation = tableRef.value.validateAllocations();
  if (!validation.valid) {
    errorMessage.value = 'Please fix the allocation errors below';
    return;
  }

  try {
    // TODO: Replace with actual API call in next phase
    // const payload = {
    //   ...headerForm,
    //   lines: allocations.value.map((line) => ({
    //     prLineId: line.id,
    //     allocatedQty: line.allocatedQty,
    //   })),
    // };
    // const created = await api.createPurchaseOrder(payload);
    // await router.push(`/purchase-orders/${created.id}`);

    // For now, show success and navigate
    console.log('PO to be created:', {
      ...headerForm,
      lines: allocations.value,
    });
    await router.push('/purchase-orders');
  } catch (error) {
    errorMessage.value = error.message;
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

.btn-outline {
  background: var(--white);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-outline:hover {
  background: var(--bg);
}
</style>
