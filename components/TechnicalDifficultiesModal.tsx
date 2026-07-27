"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function TechnicalDifficultiesModal() {
  const [open, setOpen] = useState(true)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We&apos;re experiencing technical difficulties</DialogTitle>
          <DialogDescription>
            The ECF rating data provider is currently having issues on their end. Some
            player data may be unavailable or fail to load. We&apos;ve flagged this
            with them and hope to have it resolved as soon as possible. Thanks for
            your patience.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
