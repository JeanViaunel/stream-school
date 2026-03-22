"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useChatContext } from "stream-chat-react"
import { useAuth } from "@/contexts/AuthContext"
import { useUIActions } from "@/contexts/UIActionsContext"
import { 
  MessageSquare, 
  Video, 
  Users, 
  Settings, 
  LogOut, 
  Plus,
  Search,
  Hash
} from "lucide-react"
import { toast } from "sonner"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { client, setActiveChannel } = useChatContext()
  const { session, logout } = useAuth()
  const { openDMModal, openGroupModal } = useUIActions()
  const [channels, setChannels] = useState<any[]>([])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (!client || !session) return
    
    const fetchChannels = async () => {
      const response = await client.queryChannels(
        { type: "messaging", members: { $in: [session.streamUserId] } },
        { last_message_at: -1 },
        { limit: 20 }
      )
      setChannels(response)
    }
    
    fetchChannels()
  }, [client, session])

  const handleChannelSelect = (channel: any) => {
    setActiveChannel(channel)
    router.push(`/messages/${channel.id}`)
    setOpen(false)
  }

  const handleNewDM = () => {
    setOpen(false)
    openDMModal()
  }

  const handleNewGroup = () => {
    setOpen(false)
    openGroupModal()
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    router.push("/login")
    toast.success("Logged out successfully")
  }

  const actions = [
    {
      icon: Plus,
      label: "New Direct Message",
      shortcut: "⌘N",
      action: handleNewDM,
    },
    {
      icon: Users,
      label: "New Group Chat",
      shortcut: "⌘G",
      action: handleNewGroup,
    },
    {
      icon: Video,
      label: "Start Video Call",
      shortcut: "⌘V",
      action: () => {
        setOpen(false)
        toast.info("Navigate to a channel to start a video call")
      },
    },
  ]

  const settings = [
    {
      icon: Settings,
      label: "Settings",
      shortcut: "⌘,",
      action: () => {
        setOpen(false)
        router.push("/settings")
      },
    },
    {
      icon: LogOut,
      label: "Log Out",
      shortcut: "⇧⌘Q",
      action: handleLogout,
    },
  ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search channels, users, or type a command..." 
        className="h-12"
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          <Search className="mx-auto h-8 w-8 mb-2 opacity-30" />
          No results found.
        </CommandEmpty>
        
        {channels.length > 0 && (
          <CommandGroup heading="Channels">
            {channels.map((channel) => {
              const isGroup = Object.keys(channel.state.members).length > 2
              const member = Object.values(channel.state.members).find(
                (m: any) => m.user_id !== session?.streamUserId
              ) as any
              const name = channel.data?.name || member?.user?.name || "Unknown"
              
              return (
                <CommandItem
                  key={channel.id}
                  onSelect={() => handleChannelSelect(channel)}
                  className="gap-3"
                >
                  {isGroup ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-semibold text-primary">
                        {name?.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="flex-1">{name}</span>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        <CommandSeparator />
        
        <CommandGroup heading="Actions">
          {actions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={action.action}
              className="gap-3"
            >
              <action.icon className="h-4 w-4" />
              <span className="flex-1">{action.label}</span>
              {action.shortcut && (
                <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                  {action.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          {settings.map((setting) => (
            <CommandItem
              key={setting.label}
              onSelect={setting.action}
              className="gap-3"
            >
              <setting.icon className="h-4 w-4" />
              <span className="flex-1">{setting.label}</span>
              {setting.shortcut && (
                <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                  {setting.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
