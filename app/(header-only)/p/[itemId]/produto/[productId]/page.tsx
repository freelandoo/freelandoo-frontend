import { ProductDetailView } from "./_components/product-detail-view"

export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ itemId: string; productId: string }>
}) {
  const { itemId, productId } = await params
  return <ProductDetailView profileId={itemId} productId={productId} />
}
