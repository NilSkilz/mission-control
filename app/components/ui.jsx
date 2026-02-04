'use client'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Select from '@radix-ui/react-select'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Avatar from '@radix-ui/react-avatar'
import * as Switch from '@radix-ui/react-switch'
import { CheckIcon, ChevronDownIcon, Cross2Icon, PlusIcon } from '@radix-ui/react-icons'
import { forwardRef } from 'react'

// Avatar component
export function UserAvatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-lg', md: 'w-12 h-12 text-2xl', lg: 'w-16 h-16 text-3xl' }
  return (
    <Avatar.Root className={`${sizes[size]} rounded-full bg-slate-700 inline-flex items-center justify-center overflow-hidden`}>
      <Avatar.Fallback className="flex items-center justify-center w-full h-full">
        {user?.avatar || '👤'}
      </Avatar.Fallback>
    </Avatar.Root>
  )
}

// Checkbox
export function CheckboxItem({ checked, onCheckedChange, label, className = '' }) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${className}`}>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-5 h-5 rounded bg-slate-700 border border-slate-600 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-600 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
      >
        <Checkbox.Indicator>
          <CheckIcon className="w-4 h-4 text-white" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label && <span className="text-slate-200">{label}</span>}
    </label>
  )
}

// Select
export const SelectInput = forwardRef(function SelectInput({ value, onValueChange, placeholder, children, className = '' }, ref) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger ref={ref} className={`w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white flex items-center justify-between hover:border-slate-600 focus:border-teal-500 focus:outline-none ${className}`}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
          <Select.Viewport className="p-1">
            {children}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
})

export function SelectOption({ value, children }) {
  return (
    <Select.Item value={value} className="px-3 py-2 text-white cursor-pointer outline-none rounded hover:bg-slate-700 data-[highlighted]:bg-slate-700 flex items-center gap-2">
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <CheckIcon className="w-4 h-4 text-teal-400" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

// Switch
export function SwitchInput({ checked, onCheckedChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-10 h-6 bg-slate-700 rounded-full relative data-[state=checked]:bg-teal-500 transition-colors"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
      {label && <span className="text-slate-300 text-sm">{label}</span>}
    </label>
  )
}

// Dialog/Modal
export function Modal({ open, onOpenChange, title, children, trigger }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 rounded-xl p-6 w-[90vw] max-w-md shadow-2xl z-50">
          <Dialog.Title className="text-lg font-semibold text-white mb-4">{title}</Dialog.Title>
          {children}
          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <Cross2Icon className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Tabs
export function TabsContainer({ defaultValue, children, className = '' }) {
  return (
    <Tabs.Root defaultValue={defaultValue} className={className}>
      {children}
    </Tabs.Root>
  )
}

export function TabsList({ children, className = '' }) {
  return (
    <Tabs.List className={`flex gap-1 bg-slate-800/50 p-1 rounded-lg ${className}`}>
      {children}
    </Tabs.List>
  )
}

export function TabsTrigger({ value, children }) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-sm text-slate-400 rounded-md transition-colors data-[state=active]:bg-teal-500 data-[state=active]:text-white hover:text-white"
    >
      {children}
    </Tabs.Trigger>
  )
}

export function TabsContent({ value, children, className = '' }) {
  return (
    <Tabs.Content value={value} className={`mt-4 ${className}`}>
      {children}
    </Tabs.Content>
  )
}

// Button
export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  const variants = {
    primary: 'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-700/50',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  return (
    <button className={`rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Card
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg ${className}`}>
      {children}
    </div>
  )
}

// Input
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${className}`}
      {...props}
    />
  )
}

// Badge
export function Badge({ variant = 'default', children, className = '' }) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    teal: 'bg-teal-500/20 text-teal-400'
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Navigation
export function NavLink({ href, active, children }) {
  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-teal-500/20 text-teal-400' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {children}
    </a>
  )
}
