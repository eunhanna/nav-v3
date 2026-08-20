'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ReactNode } from 'react'

type OverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
}

function OverlayHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="modal-head">
      <div>
        <p>{eyebrow}</p>
        <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
      </div>
      <DialogPrimitive.Close className="round" aria-label="关闭">
        ×
      </DialogPrimitive.Close>
    </div>
  )
}

export function Dialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
}: OverlayProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay" />
        <DialogPrimitive.Content className="modal">
          <OverlayHeader eyebrow={eyebrow} title={title} />
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Drawer({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  className = '',
}: OverlayProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay drawer-overlay" />
        <DialogPrimitive.Content className={`drawer ${className}`.trim()} data-side="right">
          <OverlayHeader eyebrow={eyebrow} title={title} />
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type AlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="overlay" />
        <AlertDialogPrimitive.Content className="modal alert-dialog">
          <div className="modal-head">
            <div>
              <p>CONFIRM</p>
              <AlertDialogPrimitive.Title>{title}</AlertDialogPrimitive.Title>
            </div>
          </div>
          <AlertDialogPrimitive.Description className="alert-description">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="modal-actions">
            <AlertDialogPrimitive.Cancel className="quiet">取消</AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className="primary destructive-primary"
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
