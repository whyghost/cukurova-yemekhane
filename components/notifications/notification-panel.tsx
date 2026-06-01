"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelativeTime, getInitials } from "@/components/comments/utils"
import { cn } from "@/lib/utils"

interface Notification {
    id: number
    type: "mention" | "reaction" | "reply"
    read: boolean
    createdAt: string
    commentId: number | null
    actorName: string | null
    actorImage: string | null
    commentContent: string | null
    menuDate: string | null
}

interface NotificationPanelProps {
    notifications: Notification[]
    loading: boolean
    unreadCount: number
    onFetch: () => void
    onMarkAsRead: (ids: number[]) => void
    onMarkAllAsRead: () => void
    onClose?: () => void
}

function getNotificationText(type: "mention" | "reaction" | "reply"): {
    prefix: string
    keyword: string
    suffix: string
} {
    switch (type) {
        case "mention":
            return { prefix: "sizden ", keyword: "bahsetti", suffix: "" }
        case "reaction":
            return { prefix: "yorumunuza ", keyword: "tepki", suffix: " bıraktı" }
        case "reply":
            return { prefix: "yorumunuza ", keyword: "yanıt", suffix: " verdi" }
    }
}

type Tab = "inbox" | "reaction" | "reply"

export function NotificationPanel({
    notifications,
    loading,
    unreadCount,
    onFetch,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose,
}: NotificationPanelProps) {
    const router = useRouter()
    const [tab, setTab] = useState<Tab>("inbox")
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 5

    const tabsRef = useRef<HTMLDivElement>(null)
    const inboxTabRef = useRef<HTMLButtonElement>(null)
    const reactionsTabRef = useRef<HTMLButtonElement>(null)
    const repliesTabRef = useRef<HTMLButtonElement>(null)
    const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

    // Liste yüksekliğini tam olarak PAGE_SIZE adet çıplak (alıntısız) satır kadar yap:
    // gizli bir örnek satırı ölçüp 5 ile çarpıyoruz → alt boşluk veya gereksiz scroll oluşmaz.
    const rowProbeRef = useRef<HTMLDivElement>(null)
    const [listHeight, setListHeight] = useState<number | null>(null)

    useLayoutEffect(() => {
        if (rowProbeRef.current) {
            setListHeight(rowProbeRef.current.getBoundingClientRect().height * PAGE_SIZE)
        }
    }, [])

    useLayoutEffect(() => {
        const activeEl =
            tab === "inbox"
                ? inboxTabRef.current
                : tab === "reaction"
                ? reactionsTabRef.current
                : repliesTabRef.current
        const container = tabsRef.current
        if (!container || !activeEl) return
        const containerRect = container.getBoundingClientRect()
        const activeRect = activeEl.getBoundingClientRect()
        setIndicator({
            left: activeRect.left - containerRect.left,
            width: activeRect.width,
        })
    }, [tab, notifications.length, unreadCount])

    useEffect(() => {
        onFetch()
    }, [onFetch])

    // Tab değişince sayfayı sıfırla
    useEffect(() => {
        setPage(0)
    }, [tab])

    const filtered =
        tab === "reaction"
            ? notifications.filter((n) => n.type === "reaction")
            : tab === "reply"
            ? notifications.filter((n) => n.type === "reply")
            : notifications

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.read) {
            onMarkAsRead([notif.id])
        }
        if (notif.menuDate) {
            onClose?.()
            router.push(`/?date=${notif.menuDate}&openComments=1`)
        }
    }

    const emptyText =
        tab === "reaction"
            ? "Tepki bildiriminiz yok."
            : tab === "reply"
            ? "Yanıt bildiriminiz yok."
            : "Henüz bildiriminiz yok."

    return (
        <div className="w-[300px] sm:w-[340px] flex flex-col">
            {/* Gizli ölçüm satırı — gerçek çıplak satırla aynı yapı/yükseklik, layout'u etkilemez */}
            <div
                ref={rowProbeRef}
                aria-hidden
                className="invisible pointer-events-none absolute -z-50 top-0 left-0 w-[300px] sm:w-[340px]"
            >
                <div className="flex items-start gap-2 px-3 py-2">
                    <div className="h-7 w-7 shrink-0 mt-0.5 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">x</p>
                        <p className="text-[10px] mt-0.5">x</p>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2">
                <h2 className="text-sm font-semibold text-foreground">Bildirimler</h2>
                <button
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className={cn(
                        "text-[10px] text-muted-foreground hover:text-primary transition-colors",
                        unreadCount === 0 && "opacity-40 pointer-events-none"
                    )}
                >
                    Tümünü okundu işaretle
                </button>
            </div>

            {/* Tabs */}
            <div ref={tabsRef} className="relative flex items-center gap-4 px-3 pt-1 border-b border-border/40">
                <button
                    ref={inboxTabRef}
                    onClick={() => setTab("inbox")}
                    className={cn(
                        "flex items-center gap-1.5 pb-2 text-[12px] font-medium transition-colors",
                        tab === "inbox"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Gelen Kutusu
                    {unreadCount > 0 && (
                        <span className={cn(
                            "inline-flex items-center justify-center min-w-[18px] h-[18px] px-2 rounded-sm text-[10px] font-semibold",
                            tab === "inbox"
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground"
                        )}>
                            {unreadCount}
                        </span>
                    )}
                </button>
                <button
                    ref={reactionsTabRef}
                    onClick={() => setTab("reaction")}
                    className={cn(
                        "pb-2 text-[12px] font-medium transition-colors",
                        tab === "reaction"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Tepkiler
                </button>
                <button
                    ref={repliesTabRef}
                    onClick={() => setTab("reply")}
                    className={cn(
                        "pb-2 text-[12px] font-medium transition-colors",
                        tab === "reply"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Yanıtlar
                </button>
                {indicator && (
                    <motion.div
                        className="absolute bottom-0 h-[2px] bg-foreground rounded-full"
                        initial={false}
                        animate={{ left: indicator.left, width: indicator.width }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                )}
            </div>

            {/* List — sabit yükseklik (tam 5 çıplak bildirim); sayfalar arası zıplama olmaz, uzun içerikte scroll */}
            <ScrollArea
                className="h-[248px]"
                style={listHeight ? { height: listHeight } : undefined}
            >
                {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground/30 border-t-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <p className="text-xs">{emptyText}</p>
                    </div>
                ) : (
                    <div>
                        {paginated.map((notif) => {
                            const text = getNotificationText(notif.type)
                            const showQuote =
                                (notif.type === "reply" || notif.type === "mention") &&
                                !!notif.commentContent
                            return (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={cn(
                                        "w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/50",
                                        !notif.read && "bg-primary/5"
                                    )}
                                >
                                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                        {notif.actorImage && (
                                            <AvatarImage
                                                src={notif.actorImage}
                                                alt={notif.actorName || ""}
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                            {getInitials(notif.actorName)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs leading-snug">
                                            <span className="font-semibold text-foreground">
                                                {notif.actorName || "Anonim"}
                                            </span>{" "}
                                            <span className="text-muted-foreground">
                                                {text.prefix}
                                                <span className="font-medium text-foreground">
                                                    {text.keyword}
                                                </span>
                                                {text.suffix}
                                            </span>
                                        </p>

                                        {showQuote && (
                                            <div className="mt-1 border-l-2 border-border pl-2">
                                                <p className="text-[11px] italic text-muted-foreground/60 line-clamp-2">
                                                    &ldquo;{notif.commentContent}&rdquo;
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                            {formatRelativeTime(notif.createdAt)}
                                        </p>
                                    </div>

                                    {!notif.read && (
                                        <div className="shrink-0 mt-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40">
                    <button
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 0}
                        className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                        Önceki
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                        Sonraki
                    </button>
                </div>
            )}
        </div>
    )
}
