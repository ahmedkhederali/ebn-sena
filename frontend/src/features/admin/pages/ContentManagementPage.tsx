import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../../shared/components/layout/AdminLayout'
import { apiClient } from '../../../shared/api/client'
import { Button } from '../../../shared/components/ui/Button'
import { Spinner } from '../../../shared/components/ui/Spinner'
import { useToast } from '../../../shared/hooks/useToast'
import { useRTL } from '../../../shared/hooks/useRTL'

interface ContentBlock {
  key: string
  valueAr: string
  valueEn: string
  type: 'text' | 'html' | 'number'
}

export default function ContentManagementPage() {
  const { t } = useTranslation('admin')
  const { lang } = useRTL()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [edits, setEdits] = useState<Record<string, { valueAr: string; valueEn: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['content-blocks'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: true; data: Record<string, { ar: string; en: string }> }>('/content/public')
      return Object.entries(res.data.data ?? {}).map(([key, val]) => ({
        key,
        valueAr: val.ar,
        valueEn: val.en,
        type: 'text' as const,
      }))
    },
  })

  useEffect(() => {
    if (data) {
      const initial: Record<string, { valueAr: string; valueEn: string }> = {}
      data.forEach((b) => {
        initial[b.key] = { valueAr: b.valueAr, valueEn: b.valueEn }
      })
      setEdits(initial)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async ({ key, valueAr, valueEn }: { key: string; valueAr: string; valueEn: string }) => {
      await apiClient.put(`/content/${key}`, { ar: valueAr, en: valueEn })
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['content-blocks'] })
      addToast({
        type: 'success',
        message: lang === 'ar' ? 'تم الحفظ' : 'Saved',
      })
      setSaving(null)
      // Mark as clean by updating local edit to match saved
      setEdits((prev) => ({
        ...prev,
        [variables.key]: { valueAr: variables.valueAr, valueEn: variables.valueEn },
      }))
    },
    onError: () => {
      addToast({ type: 'error', message: lang === 'ar' ? 'فشل الحفظ' : 'Save failed' })
      setSaving(null)
    },
  })

  const handleSave = (key: string) => {
    const edit = edits[key]
    if (!edit) return
    setSaving(key)
    updateMutation.mutate({ key, ...edit })
  }

  const isDirty = (block: ContentBlock) => {
    const edit = edits[block.key]
    if (!edit) return false
    return edit.valueAr !== block.valueAr || edit.valueEn !== block.valueEn
  }

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('content.title')}</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {lang === 'ar' ? 'لا توجد محتويات' : 'No content blocks'}
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((block) => {
            const edit = edits[block.key] ?? { valueAr: block.valueAr, valueEn: block.valueEn }
            const dirty = isDirty(block)

            return (
              <div key={block.key} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
                      {block.key}
                    </span>
                    <span className="ms-2 text-xs text-gray-400">{block.type}</span>
                  </div>
                  {dirty && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      {lang === 'ar' ? 'غير محفوظ' : 'Unsaved'}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {lang === 'ar' ? 'النص بالعربية' : 'Arabic'}
                    </label>
                    {block.type === 'html' || block.valueAr.length > 100 ? (
                      <textarea
                        value={edit.valueAr}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [block.key]: { ...edit, valueAr: e.target.value },
                          }))
                        }
                        rows={4}
                        dir="rtl"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={edit.valueAr}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [block.key]: { ...edit, valueAr: e.target.value },
                          }))
                        }
                        dir="rtl"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {lang === 'ar' ? 'النص بالإنجليزية' : 'English'}
                    </label>
                    {block.type === 'html' || block.valueEn.length > 100 ? (
                      <textarea
                        value={edit.valueEn}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [block.key]: { ...edit, valueEn: e.target.value },
                          }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={edit.valueEn}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [block.key]: { ...edit, valueEn: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    isLoading={saving === block.key}
                    disabled={!dirty}
                    onClick={() => handleSave(block.key)}
                  >
                    {lang === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
