<template>
  <section class="purchase-order-page">
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink
          to="/"
          class="back-btn"
          title="Back to dashboard"
          aria-label="Back to dashboard"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Create Purchase Order</h2>
          <p class="muted">
            Pick approved PR lines and allocate order quantities
          </p>
        </div>
      </div>
    </div>

    <form
      @submit.prevent="
        showActionMessage('Draft saved locally. No API call was made.')
      "
    >
      <PurchaseOrderHeaderForm v-model="header" />
      <PurchaseOrderAllocationTable
        :lines="lines"
        @update-line="updateLine"
        @refresh="showActionMessage('Open PR lines are sample data.')"
      />

      <section class="card-panel po-summary" aria-live="polite">
        <div>
          <p>Selected Lines</p>
          <strong>{{ selectedLines.length }}</strong>
        </div>
        <div class="summary-total">
          <p>Estimated Total</p>
          <strong>{{ formatAmount(estimatedTotal) }}</strong>
        </div>
      </section>

      <div class="po-actions">
        <p v-if="actionMessage" class="muted action-message" role="status">
          {{ actionMessage }}
        </p>
        <div class="btn-group">
          <button class="btn btn-secondary" type="submit">Save As Draft</button>
          <button
            class="btn btn-primary"
            type="button"
            @click="
              showActionMessage(
                'PO submission is UI-only. No API call was made.',
              )
            "
          >
            Submit PO
          </button>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import PurchaseOrderAllocationTable from "../components/PurchaseOrderAllocationTable.vue";
import PurchaseOrderHeaderForm from "../components/PurchaseOrderHeaderForm.vue";

const header = ref({
  vendor: "",
  neededByDate: "",
  currency: "IDR",
  paymentTerms: "",
  notes: "",
});

const lines = reactive([
  {
    id: "pr-001-1",
    selected: true,
    prNo: "PR-001",
    prLine: 1,
    itemCode: "ITEM-001",
    itemName: "Bearing-6205",
    uom: "PCS",
    requestedQty: 20,
    allocatedQty: 5,
    remainingQty: 15,
    orderQty: 10,
    deliveryAddress: "",
    deliveryDate: "",
    unitPrice: 150000,
  },
  {
    id: "pr-001-2",
    selected: true,
    prNo: "PR-001",
    prLine: 2,
    itemCode: "ITEM-009",
    itemName: "Grease High Temp",
    uom: "TUBE",
    requestedQty: 12,
    allocatedQty: 0,
    remainingQty: 12,
    orderQty: 0,
    deliveryAddress: "",
    deliveryDate: "",
    unitPrice: 0,
  },
  {
    id: "pr-004-1",
    selected: true,
    prNo: "PR-004",
    prLine: 1,
    itemCode: "ITEM-015",
    itemName: "Bearing-6205",
    uom: "PAIR",
    requestedQty: 50,
    allocatedQty: 10,
    remainingQty: 40,
    orderQty: 20,
    deliveryAddress: "",
    deliveryDate: "",
    unitPrice: 32000,
  },
]);

const actionMessage = ref("");
const selectedLines = computed(() => lines.filter((line) => line.selected));
const estimatedTotal = computed(() =>
  selectedLines.value.reduce(
    (total, line) => total + line.orderQty * line.unitPrice,
    0,
  ),
);

function updateLine({ index, field, value }) {
  Object.assign(lines[index], { [field]: value });
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function showActionMessage(message) {
  actionMessage.value = message;
}
</script>

<style scoped>
.purchase-order-page {
  max-width: 1440px;
  margin: 0 auto;
}
.po-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.po-summary p {
  margin: 0 0 6px;
  font-size: 13px;
}
.po-summary strong {
  font-size: 24px;
  font-weight: 600;
}
.summary-total {
  text-align: right;
}
.po-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.po-actions .btn-group {
  margin-left: auto;
}
.btn-secondary {
  background: #fdb702;
  color: var(--white);
}
.action-message {
  margin: 0;
}

@media (max-width: 600px) {
  .page-header-left {
    gap: 12px;
  }
  .page-header h2 {
    font-size: 20px;
  }
  .po-summary strong {
    font-size: 20px;
  }
  .po-actions {
    align-items: flex-start;
    flex-direction: column;
  }
  .po-actions .btn-group {
    justify-content: flex-end;
    width: 100%;
  }
}
</style>
