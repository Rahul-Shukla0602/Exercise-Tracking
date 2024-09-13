import React from 'react'
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

// alert component using class-variance-authority (cva)
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Alert component
// Accepts `variant` prop to determine styling and `className` for additional custom styles
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

// AlertTitle component
// Renders a heading for the alert title with custom styles
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> >((
    { className, ...props }, ref) => (
  <h5  ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />))
AlertTitle.displayName = "AlertTitle"

// AlertDescription component
// Renders a description for the alert with custom styles
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// Export the components
export { Alert, AlertTitle, AlertDescription }
