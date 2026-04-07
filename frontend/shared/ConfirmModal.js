'use client'

import { Button, Group, Modal, Text } from '@mantine/core'

/**
 * Generic confirmation modal.
 *
 * Props:
 *   opened       – boolean
 *   onClose      – () => void
 *   onConfirm    – () => void
 *   title        – modal title
 *   message      – body text (string or node)
 *   confirmLabel – confirm button text (default "Confirm")
 *   confirmColor – confirm button color (default "blue")
 *   cancelLabel  – cancel button text (default "Cancel")
 */
export default function ConfirmModal({
  opened, onClose, onConfirm, title = 'Confirm',
  message, confirmLabel = 'Confirm', confirmColor = 'blue', cancelLabel = 'Cancel',
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <Text size="sm" mb="lg">{message}</Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>{cancelLabel}</Button>
        <Button color={confirmColor} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </Group>
    </Modal>
  )
}
