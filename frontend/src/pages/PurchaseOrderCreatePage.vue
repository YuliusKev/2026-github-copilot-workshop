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

    <form novalidate @submit.prevent="saveOrder()">
      <p v-if="errorMessage" class="error action-message" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="loading" class="muted" role="status">
        Loading approved PR lines...
      </p>
      <fieldset class="po-fields" :disabled="loading || saving || !!savedOrder">
        <PurchaseOrderHeaderForm v-model="header" />
        <PurchaseOrderAllocationTable
          :lines="lines"
          @update-line="updateLine"
          @refresh="refreshOpenLines"
        />
      </fieldset>
      <p
        v-if="!loading && !errorMessage && !lines.length"
        class="muted"
        role="status"
      >
        No approved PR lines are available for allocation.
      </p>

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
          <button
            class="btn btn-secondary"
            type="submit"
            :disabled="loading || saving || !!savedOrder"
          >
            Save As Draft
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="loading || saving || savedOrder?.status === 'SUBMITTED'"
            @click="saveOrder(true)"
          >
            Submit PO
          </button>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router";
import PurchaseOrderAllocationTable from "../components/PurchaseOrderAllocationTable.vue";
import PurchaseOrderHeaderForm from "../components/PurchaseOrderHeaderForm.vue";
import { usePurchaseOrderCreate } from "../composables/usePurchaseOrderCreate";

const {
  header,
  lines,
  loading,
  saving,
  errorMessage,
  actionMessage,
  savedOrder,
  selectedLines,
  estimatedTotal,
  refreshOpenLines,
  updateLine,
  saveOrder,
} = usePurchaseOrderCreate();

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}
</script>

<style scoped>
.purchase-order-page {
  max-width: 1440px;
  margin: 0 auto;
}
.po-fields {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
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
