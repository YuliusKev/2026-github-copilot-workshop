<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Purchase Order Detail</h2>
          <p class="muted">
            {{ purchaseOrder?.poNumber || "-" }} &mdash; Purchase Order
            information
          </p>
        </div>
      </div>
      <button
        v-if="purchaseOrder?.status === 'DRAFT'"
        class="btn btn-primary"
        type="button"
        :disabled="submitting"
        @click="submitPurchaseOrder"
      >
        {{ submitting ? "Submitting..." : "Submit PO" }}
      </button>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="loading" class="muted" role="status">Loading purchase order...</p>

    <template v-if="purchaseOrder">
      <div class="card-panel">
        <p class="form-section-title">PO Header</p>
        <div class="form-row">
          <div class="form-group">
            <label>PO Number</label>
            <input :value="purchaseOrder.poNumber" disabled />
          </div>
          <div class="form-group">
            <label>Vendor</label>
            <input :value="purchaseOrder.vendorName" disabled />
          </div>
          <div class="form-group">
            <label>Status</label>
            <span
              class="status-badge"
              :class="purchaseOrder.status.toLowerCase()"
              >{{ purchaseOrder.status }}</span
            >
          </div>
        </div>
      </div>

      <div class="card-panel">
        <p class="form-section-title">PO Lines</p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th>Item</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Open for GR</th>
                <th>UOM</th>
                <th>Unit Price</th>
                <th>Site</th>
                <th>Required Date</th>
                <th>PR Allocation</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in purchaseOrder.lines" :key="line.id">
                <td>{{ line.lineNo }}</td>
                <td>{{ line.itemCode }} - {{ line.itemName }}</td>
                <td>{{ line.qtyOrdered }}</td>
                <td>{{ line.qtyReceived }}</td>
                <td>{{ line.qtyOpenForGr }}</td>
                <td>{{ line.uom }}</td>
                <td>{{ formatAmount(line.unitPrice) }}</td>
                <td>{{ line.siteCode }}</td>
                <td>{{ formatDate(line.requiredDate) }}</td>
                <td>{{ formatAllocations(line.allocations) }}</td>
              </tr>
              <tr v-if="!purchaseOrder.lines.length">
                <td colspan="10" class="muted">
                  No purchase order lines found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { api } from "../api";

const route = useRoute();
const purchaseOrder = ref(null);
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatDate(value) {
  return value ? value.slice(0, 10) : "-";
}

function formatAllocations(allocations) {
  return allocations?.length
    ? allocations
        .map(
          (allocation) => `${allocation.prNumber} (${allocation.allocatedQty})`,
        )
        .join(", ")
    : "-";
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  purchaseOrder.value = null;
  try {
    purchaseOrder.value = await api.getPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function submitPurchaseOrder() {
  submitting.value = true;
  errorMessage.value = "";
  try {
    purchaseOrder.value = await api.submitPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    submitting.value = false;
  }
}

watch(() => route.params.id, load, { immediate: true });
</script>

<style scoped>
.form-group input:disabled {
  background: var(--white);
  color: var(--text);
  cursor: default;
  opacity: 1;
}

.table-scroll {
  overflow-x: auto;
}

.table-scroll table {
  min-width: 1000px;
}
</style>
