<template>
  <section class="card-panel allocation-panel">
    <div class="card-panel-header">
      <h3>Approved PR Lines</h3>
      <button
        class="btn btn-outline refresh-button"
        type="button"
        @click="$emit('refresh')"
      >
        Refresh Open Lines
      </button>
    </div>
    <div class="table-scroll">
      <table class="allocation-table">
        <thead>
          <tr>
            <th scope="col">Select</th>
            <th scope="col">PR No</th>
            <th scope="col">PR Line</th>
            <th scope="col">Item Code</th>
            <th scope="col">Item Name</th>
            <th scope="col">UOM</th>
            <th scope="col">Requested Qty</th>
            <th scope="col">Allocated Qty</th>
            <th scope="col">Remaining Qty</th>
            <th scope="col">Order Qty</th>
            <th scope="col">Delivery Address</th>
            <th scope="col">Delivery Date</th>
            <th scope="col">Unit Price</th>
            <th scope="col">Line Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in lines" :key="line.id">
            <td>
              <input
                type="checkbox"
                :checked="line.selected"
                :aria-label="`Select ${line.prNo} line ${line.prLine}`"
                @change="updateLine(index, 'selected', $event.target.checked)"
              />
            </td>
            <td>{{ line.prNo }}</td>
            <td>{{ line.prLine }}</td>
            <td>{{ line.itemCode }}</td>
            <td class="item-name">{{ line.itemName }}</td>
            <td>{{ line.uom }}</td>
            <td>{{ line.requestedQty }}</td>
            <td>{{ line.allocatedQty }}</td>
            <td>{{ line.remainingQty }}</td>
            <td>
              <input
                type="number"
                min="0"
                :max="line.remainingQty"
                step="1"
                :value="line.orderQty"
                :aria-label="`Order quantity for ${line.itemName}`"
                @input="updateLine(index, 'orderQty', numericValue($event))"
              />
            </td>
            <td>
              <input
                type="text"
                :value="line.deliveryAddress"
                :aria-label="`Delivery address for ${line.itemName}`"
                placeholder="Type..."
                @input="
                  updateLine(index, 'deliveryAddress', $event.target.value)
                "
              />
            </td>
            <td>
              <input
                type="date"
                :value="line.deliveryDate"
                :aria-label="`Delivery date for ${line.itemName}`"
                @input="updateLine(index, 'deliveryDate', $event.target.value)"
              />
            </td>
            <td>
              <input
                type="number"
                min="0"
                step="1"
                :value="line.unitPrice"
                :aria-label="`Unit price for ${line.itemName}`"
                @input="updateLine(index, 'unitPrice', numericValue($event))"
              />
            </td>
            <td>{{ formatAmount(line.orderQty * line.unitPrice) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
defineProps({
  lines: { type: Array, required: true },
});

const emit = defineEmits(["update-line", "refresh"]);

function updateLine(index, field, value) {
  emit("update-line", { index, field, value });
}

function numericValue(event) {
  return Math.max(Number(event.target.value) || 0, 0);
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}
</script>

<style scoped>
.allocation-panel {
  margin-bottom: 24px;
}
.allocation-panel .card-panel-header {
  margin-bottom: 16px;
}
.allocation-panel h3 {
  margin: 0;
  font-size: 14px;
}
.refresh-button {
  border-color: var(--primary);
  border-radius: 24px;
}
.table-scroll {
  overflow-x: auto;
}
.allocation-table {
  min-width: 1120px;
  table-layout: fixed;
}
.allocation-table th,
.allocation-table td {
  padding: 7px 6px;
  font-size: 11px;
}
.allocation-table th {
  font-size: 11px;
  line-height: 1.25;
}
.allocation-table th:nth-child(1) {
  width: 54px;
}
.allocation-table th:nth-child(2) {
  width: 58px;
}
.allocation-table th:nth-child(3) {
  width: 48px;
}
.allocation-table th:nth-child(4) {
  width: 76px;
}
.allocation-table th:nth-child(6) {
  width: 48px;
}
.allocation-table th:nth-child(7),
.allocation-table th:nth-child(8),
.allocation-table th:nth-child(9) {
  width: 70px;
}
.allocation-table th:nth-child(10) {
  width: 76px;
}
.allocation-table th:nth-child(11) {
  width: 116px;
}
.allocation-table th:nth-child(12) {
  width: 100px;
}
.allocation-table th:nth-child(13) {
  width: 84px;
}
.allocation-table th:nth-child(14) {
  width: 96px;
}
.allocation-table .item-name {
  overflow-wrap: anywhere;
}
.allocation-table input[type="text"],
.allocation-table input[type="number"],
.allocation-table input[type="date"] {
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--white);
  color: var(--text);
  font: inherit;
}
.allocation-table input[type="checkbox"] {
  accent-color: var(--primary);
}
</style>
