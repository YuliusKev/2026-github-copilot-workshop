<template>
  <section class="goods-receipt-page">
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink
          to="/goods-receipts"
          class="back-btn"
          title="Back to goods receipts"
          aria-label="Back to goods receipts"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Create Goods Receipt</h2>
          <p class="muted">
            Record delivered quantities against a submitted purchase order.
          </p>
        </div>
      </div>
    </div>

    <form novalidate @submit.prevent="saveReceipt">
      <p v-if="errorMessage" class="error action-message" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="loadingPurchaseOrders" class="muted" role="status">
        Loading submitted purchase orders...
      </p>

      <section class="card-panel">
        <p class="form-section-title">Receipt Header</p>
        <div class="form-row receipt-header-fields">
          <div class="form-group">
            <label for="gr-po">Purchase Order</label>
            <select
              id="gr-po"
              v-model="selectedPoId"
              :disabled="loadingPurchaseOrders || loadingLines || saving"
              @change="loadOpenLines"
            >
              <option value="">Select a submitted purchase order</option>
              <option
                v-for="purchaseOrder in purchaseOrders"
                :key="purchaseOrder.id"
                :value="purchaseOrder.id"
              >
                {{ purchaseOrder.poNumber }} - {{ purchaseOrder.vendorName }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="gr-date">Receipt Date</label>
            <input
              id="gr-date"
              v-model="receiptDate"
              type="date"
              :disabled="saving"
            />
          </div>
          <div class="form-group full">
            <label for="gr-notes">Notes</label>
            <textarea
              id="gr-notes"
              v-model="notes"
              rows="2"
              :disabled="saving"
            />
          </div>
        </div>
      </section>

      <p v-if="loadingLines" class="muted" role="status">
        Loading open purchase order lines...
      </p>
      <p v-else-if="selectedPoId && !lines.length" class="muted" role="status">
        This purchase order has no open lines to receive.
      </p>
      <p
        v-else-if="!purchaseOrders.length && !loadingPurchaseOrders"
        class="muted"
        role="status"
      >
        No submitted purchase orders are available.
      </p>

      <section v-if="lines.length" class="card-panel">
        <p class="form-section-title">Receipt Lines</p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Receive</th>
                <th>Item</th>
                <th>Open Quantity</th>
                <th>Receive Quantity</th>
                <th>UOM</th>
                <th>Actual Site</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in lines" :key="line.id">
                <td>
                  <input
                    v-model="lineInputs[line.id].selected"
                    type="checkbox"
                    :aria-label="`Receive ${line.itemName}`"
                    :disabled="saving"
                  />
                </td>
                <td>{{ line.itemCode }} - {{ line.itemName }}</td>
                <td>{{ line.qtyOpenForGr }}</td>
                <td>
                  <input
                    v-model.number="lineInputs[line.id].qtyReceived"
                    type="number"
                    min="0.01"
                    :max="line.qtyOpenForGr"
                    step="0.01"
                    :aria-label="`Received quantity for ${line.itemName}`"
                    :disabled="saving || !lineInputs[line.id].selected"
                  />
                </td>
                <td>{{ line.uom }}</td>
                <td>
                  <input
                    v-model.trim="lineInputs[line.id].actualSiteCode"
                    type="text"
                    required
                    :aria-label="`Actual site for ${line.itemName}`"
                    :disabled="saving || !lineInputs[line.id].selected"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="receipt-actions">
        <p v-if="actionMessage" class="muted action-message" role="status">
          {{ actionMessage }}
        </p>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="saving || loadingLines || !lines.length"
        >
          {{ saving ? "Saving..." : "Save As Draft" }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { api } from "../api";

const route = useRoute();
const router = useRouter();
const purchaseOrders = ref([]);
const selectedPoId = ref("");
const lines = ref([]);
const lineInputs = ref({});
const receiptDate = ref(new Date().toISOString().slice(0, 10));
const notes = ref("");
const loadingPurchaseOrders = ref(true);
const loadingLines = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const actionMessage = ref("");

async function loadPurchaseOrders() {
  loadingPurchaseOrders.value = true;
  errorMessage.value = "";
  try {
    const payload = await api.listPurchaseOrders();
    purchaseOrders.value = (payload.items || []).filter(
      (item) => item.status === "SUBMITTED",
    );
    const requestedPoId = route.query?.poId;
    if (
      requestedPoId &&
      purchaseOrders.value.some((item) => item.id === requestedPoId)
    ) {
      selectedPoId.value = requestedPoId;
      await loadOpenLines();
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loadingPurchaseOrders.value = false;
  }
}

async function loadOpenLines() {
  lines.value = [];
  lineInputs.value = {};
  if (!selectedPoId.value) return;

  loadingLines.value = true;
  errorMessage.value = "";
  try {
    const payload = await api.getPurchaseOrderOpenLines(selectedPoId.value);
    if (payload.purchaseOrder.status !== "SUBMITTED") {
      throw new Error("Only submitted purchase orders can receive goods.");
    }
    lines.value = payload.openLines || [];
    lineInputs.value = Object.fromEntries(
      lines.value.map((line) => [
        line.id,
        {
          selected: false,
          qtyReceived: Number(line.qtyOpenForGr),
          actualSiteCode: line.siteCode || "",
        },
      ]),
    );
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loadingLines.value = false;
  }
}

async function saveReceipt() {
  errorMessage.value = "";
  actionMessage.value = "";
  if (!selectedPoId.value) {
    errorMessage.value = "Select a submitted purchase order.";
    return;
  }

  const selectedLines = lines.value.filter(
    (line) => lineInputs.value[line.id]?.selected,
  );
  if (!selectedLines.length) {
    errorMessage.value = "Select at least one line to receive.";
    return;
  }

  for (const line of selectedLines) {
    const input = lineInputs.value[line.id];
    if (
      !Number.isFinite(Number(input.qtyReceived)) ||
      Number(input.qtyReceived) <= 0
    ) {
      errorMessage.value = `Received quantity for ${line.itemName} must be greater than 0.`;
      return;
    }
    if (Number(input.qtyReceived) > Number(line.qtyOpenForGr)) {
      errorMessage.value = `Received quantity for ${line.itemName} exceeds the open quantity ${line.qtyOpenForGr}.`;
      return;
    }
    if (!input.actualSiteCode.trim()) {
      errorMessage.value = `Actual site for ${line.itemName} is required.`;
      return;
    }
  }

  saving.value = true;
  try {
    const receipt = await api.createGoodsReceipt({
      poId: selectedPoId.value,
      receiptDate: receiptDate.value || null,
      notes: notes.value.trim() || null,
      lines: selectedLines.map((line) => ({
        poLineId: line.id,
        qtyReceived: Number(lineInputs.value[line.id].qtyReceived),
        actualSiteCode: lineInputs.value[line.id].actualSiteCode.trim(),
      })),
    });
    actionMessage.value = `${receipt.grNumber}: draft saved.`;
    await router.push({
      name: "goods-receipts-detail",
      params: { id: receipt.id },
    });
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

onMounted(loadPurchaseOrders);
</script>

<style scoped>
.goods-receipt-page {
  max-width: 1440px;
  margin: 0 auto;
}

.receipt-header-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.table-scroll {
  overflow-x: auto;
}

table {
  min-width: 780px;
}

td input[type="number"],
td input[type="text"] {
  width: 130px;
  padding: 8px;
}

.receipt-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.action-message {
  margin: 0 auto 0 0;
}

@media (max-width: 600px) {
  .page-header h2 {
    font-size: 20px;
  }

  .receipt-header-fields {
    grid-template-columns: 1fr;
  }

  .receipt-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
