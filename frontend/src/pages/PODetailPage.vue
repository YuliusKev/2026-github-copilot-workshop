<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/purchase-orders" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Purchase Order Detail</h2>
          <p class="muted">{{ po?.poNumber || '-' }} &mdash; Purchase Order information detail</p>
        </div>
      </div>
      <div class="btn-group" v-if="po">
        <button v-if="po.status === 'DRAFT'" class="btn btn-primary" @click="submitPO">Submit PO</button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <!-- PO Header card -->
    <div class="card-panel" v-if="po">
      <p class="form-section-title">PO Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>PO Number</label>
          <input :value="po.poNumber" disabled />
        </div>
        <div class="form-group">
          <label>Vendor</label>
          <input :value="po.vendorName" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="po.status.toLowerCase()">{{ po.status }}</span>
        </div>
        <div class="form-group">
          <label>Total</label>
          <input :value="formatPrice(total)" disabled />
        </div>
      </div>
    </div>

    <!-- PO Lines card -->
    <div class="card-panel" v-if="po">
      <p class="form-section-title">PO Lines</p>
      <table v-if="po.lines.length > 0">
        <thead>
          <tr>
            <th style="width: 50px">Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Qty Ordered</th>
            <th>UOM</th>
            <th>Unit Price</th>
            <th>Site</th>
            <th>Required Date</th>
            <th>Line Total</th>
            <th>Allocated From</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in po.lines" :key="line.id">
            <td>{{ line.lineNo }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.qtyOrdered }}</td>
            <td>{{ line.uom }}</td>
            <td class="text-right">{{ formatPrice(line.unitPrice) }}</td>
            <td>{{ line.siteCode }}</td>
            <td>{{ line.requiredDate || '-' }}</td>
            <td class="text-right"><strong>{{ formatPrice(line.unitPrice * line.qtyOrdered) }}</strong></td>
            <td>{{ formatAllocations(line.allocations) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-message">No lines on this purchase order.</p>
    </div>

    <div class="btn-group">
      <RouterLink to="/purchase-orders" class="btn btn-outline">Back to List</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const po = ref(null);
const errorMessage = ref('');

const total = computed(() =>
  (po.value?.lines || []).reduce((sum, line) => sum + line.unitPrice * line.qtyOrdered, 0)
);

function formatPrice(value) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00';
}

function formatAllocations(allocations) {
  if (!allocations || allocations.length === 0) return '-';
  return allocations.map((a) => `${a.prNumber} (${a.allocatedQty})`).join(', ');
}

async function load() {
  errorMessage.value = '';
  try {
    po.value = await api.getPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function submitPO() {
  try {
    po.value = await api.submitPurchaseOrder(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

onMounted(load);
</script>

<style scoped>
.text-right {
  text-align: right;
}

.empty-message {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>

