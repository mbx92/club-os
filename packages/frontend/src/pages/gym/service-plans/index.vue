<route lang="yaml">
meta:
  title: Service Plans
  layout: default
</route>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/gym/catalog')
})
</script>
