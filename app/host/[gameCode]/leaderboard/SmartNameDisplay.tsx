"use client"

import React from "react"
import { formatDisplayName } from "@/lib/utils"

interface SmartNameDisplayProps {
    name: string
    maxLength?: number
    className?: string
    multilineClassName?: string
}

// === SMART NAME DISPLAY ===
export const SmartNameDisplay = React.memo(({
    name,
    maxLength = 12,
    className = "",
    multilineClassName = ""
}: SmartNameDisplayProps) => {
    const { displayName, isBroken } = formatDisplayName(name, maxLength)

    if (isBroken) {
        return (
            <span className={`${className} ${multilineClassName} whitespace-pre-line leading-tight`} title={name}>
                {displayName}
            </span>
        )
    }

    return (
        <span className={className} title={name}>
            {displayName}
        </span>
    )
})
SmartNameDisplay.displayName = "SmartNameDisplay"
