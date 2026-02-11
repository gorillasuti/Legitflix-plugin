import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import './button.css'

/**
 * Variant → CSS class mapping
 */
const VARIANT_MAP = {
    default: 'lf-btn--primary',
    primary: 'lf-btn--primary',
    ringHover: 'lf-btn--ring-hover',
    glass: 'lf-btn--glass',
    outline: 'lf-btn--outline',
    ghost: 'lf-btn--ghost',
    destructive: 'lf-btn--destructive',
}

const SIZE_MAP = {
    default: '',
    sm: 'lf-btn--sm',
    lg: 'lf-btn--lg',
    icon: 'lf-btn--icon',
}

const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.default
    const sizeClass = SIZE_MAP[size] || ''
    const classes = ['lf-btn', variantClass, sizeClass, className].filter(Boolean).join(' ')

    return (
        <Comp
            className={classes}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
