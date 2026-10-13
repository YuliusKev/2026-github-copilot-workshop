<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to Dashboard"
          >&#8592;</RouterLink
        >
        <div>
          <h2>Purchase Orders</h2>
          <p class="muted">All purchase order records</p>
        </div>
      </div>
      <RouterLink class="btn btn-outline" to="/purchase-orders/new"
        >+ New PO</RouterLink
      >
    </div>

    <label class="bookmark-filter">
      <input
        v-model="bookmarkedOnly"
        type="checkbox"
        :disabled="loading"
        @change="loadPurchaseOrders"
      />
      Bookmarked only
    </label>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="loading" class="muted" role="status">
      Loading purchase orders...
    </p>
    <p v-else-if="!items.length" class="muted" role="status">
      {{
        bookmarkedOnly
          ? "No bookmarked purchase orders found."
          : "No purchase orders found."
      }}
    </p>

    <div v-else class="card-panel">
      <table>
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Created</th>
            <th>Bookmark</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <RouterLink :to="`/purchase-orders/${item.id}`">{{
                item.poNumber
              }}</RouterLink>
            </td>
            <td>{{ item.vendorName }}</td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">{{
                item.status
              }}</span>
            </td>
            <td>{{ formatDate(item.createdAt) }}</td>
            <td>
              <PurchaseOrderBookmarkButton
                :purchase-order-id="item.id"
                :is-bookmarked="item.isBookmarked"
                @updated="
                  (isBookmarked) => updateBookmarkState(item, isBookmarked)
                "
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api";
import PurchaseOrderBookmarkButton from "../components/PurchaseOrderBookmarkButton.vue";

const items = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const bookmarkedOnly = ref(false);

function formatDate(value) {
  return value ? value.slice(0, 10) : "-";
}

async function loadPurchaseOrders() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const payload = await api.listPurchaseOrders(bookmarkedOnly.value);
    items.value = payload.items;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function updateBookmarkState(item, isBookmarked) {
  if (bookmarkedOnly.value && !isBookmarked) {
    items.value = items.value.filter(
      (purchaseOrder) => purchaseOrder.id !== item.id,
    );
    return;
  }

  item.isBookmarked = isBookmarked;
}

onMounted(loadPurchaseOrders);
</script>

<style scoped>
.bookmark-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
</style>
