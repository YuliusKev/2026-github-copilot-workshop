<script setup>
import { ref } from "vue";
import { api } from "../api";

const props = defineProps({
  purchaseOrderId: { type: String, required: true },
  isBookmarked: { type: Boolean, default: false },
});

const emit = defineEmits(["updated"]);
const saving = ref(false);
const errorMessage = ref("");

async function toggleBookmark() {
  saving.value = true;
  errorMessage.value = "";

  try {
    const updateBookmark = props.isBookmarked
      ? api.removePurchaseOrderBookmark
      : api.bookmarkPurchaseOrder;
    const result = await updateBookmark(props.purchaseOrderId);
    emit("updated", result.isBookmarked);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="bookmark-action">
    <button
      class="btn btn-outline"
      type="button"
      :aria-label="
        props.isBookmarked ? 'Remove bookmark' : 'Bookmark purchase order'
      "
      :disabled="saving"
      @click="toggleBookmark"
    >
      {{
        saving
          ? "Saving..."
          : props.isBookmarked
            ? "Remove bookmark"
            : "Bookmark"
      }}
    </button>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.bookmark-action {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.bookmark-action .btn {
  padding: 8px 14px;
}

.bookmark-action .error {
  margin: 0;
}
</style>
