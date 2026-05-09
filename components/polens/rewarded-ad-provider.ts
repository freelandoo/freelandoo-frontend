export type RewardedAdProvider = {
  loadAd: () => Promise<void>
  showAd: () => Promise<void>
  onRewardEarned: (cb: () => void) => void
  onAdClosed: (cb: () => void) => void
  onAdFailed: (cb: (message: string) => void) => void
}

export function createMockRewardedAdProvider(): RewardedAdProvider {
  let rewardCb = () => {}
  let closedCb = () => {}
  let failedCb = (_message: string) => {}

  return {
    async loadAd() {
      await new Promise((resolve) => setTimeout(resolve, 500))
    },
    async showAd() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2500))
        rewardCb()
        closedCb()
      } catch {
        failedCb("Não foi possível carregar o anúncio.")
      }
    },
    onRewardEarned(cb) {
      rewardCb = cb
    },
    onAdClosed(cb) {
      closedCb = cb
    },
    onAdFailed(cb) {
      failedCb = cb
    },
  }
}
