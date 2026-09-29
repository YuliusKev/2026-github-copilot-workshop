<template>
  <section>
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to list">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipt Detail</h2>
          <p class="muted">{{ gr?.grNumber || '-' }} &mdash; Goods receipt information detail</p>
        </div>
      </div>
      <div class="btn-group" v-if="gr">
        <button v-if="gr.status === 'DRAFT'" class="btn btn-primary" @click="postGR">Post GR</button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <!-- GR Header card -->
    <div class="card-panel" v-if="gr">
      <p class="form-section-title">GR Header</p>
      <div class="form-row">
        <div class="form-group">
          <label>GR Number</label>
          <input :value="gr.grNumber" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <span class="status-badge" :class="gr.status.toLowerCase()">{{ gr.status }}</span>
        </div>
        <div class="form-group">
          <label>Receipt Date</label>
          <input :value="gr.receiptDate || '-'" disabled />
        </div>
      </div>
      <div class="form-group full" v-if="gr.notes">
        <label>Notes</label>
        <input :value="gr.notes" disabled />
      </div>
    </div>

    <!-- GR Lines card -->
    <div class="card-panel" v-if="gr">
      <p class="form-section-title">GR Lines</p>
      <table v-if="gr.lines.length > 0">
        <thead>
          <tr>
            <th style="width: 50px">Line</th>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>Qty Received</th>
            <th>Site Code</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in gr.lines" :key="line.id">
            <td>{{ line.lineNo }}</td>
            <td>{{ line.itemCode }}</td>
            <td>{{ line.itemName }}</td>
            <td>{{ line.uom }}</td>
            <td class="text-right">{{ line.qtyReceived }}</td>
            <td>{{ line.actualSiteCode }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-message">No lines on this goods receipt.</p>
    </div>

    <div class="btn-group">
      <RouterLink to="/goods-receipts" class="btn btn-outline">Back to List</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const gr = ref(null);
const errorMessage = ref('');

async function load() {
  errorMessage.value = '';
  try {
    gr.value = await api.getGoodsReceipt(route.params.id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function postGR() {
  try {
    gr.value = await api.postGoodsReceipt(route.params.id);
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
