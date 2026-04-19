import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface PaginationProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}

export function Pagination({ hasMore, isLoading, onLoadMore }: PaginationProps) {
  const { t } = useTranslation('common')

  if (!hasMore) return null

  return (
    <div className="mt-6 flex justify-center">
      <Button variant="secondary" isLoading={isLoading} onClick={onLoadMore}>
        {t('load_more', 'Load More')}
      </Button>
    </div>
  )
}
