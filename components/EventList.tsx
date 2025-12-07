import React from "react"
import { useState, useMemo } from "react"
import { formatDate, calculatePerformanceRating } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronUp, HelpCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Define the structure of a game object
interface Game {
  game_date: string
  event_code: string
  event_name: string
  opponent_name: string
  opponent_rating: number
  player_rating: number
  score: number
  colour: string
  opponent_no: string
}

// Define the props for the EventList component
interface EventListProps {
  games: Game[]
}

// Define the structure of an event object
interface Event {
  eventCode: string
  eventName: string
  games: Game[]
  startDate: string
  endDate: string
  performanceRating: number
}

const EVENTS_PER_PAGE = 20

export default function EventList({ games }: EventListProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  // Memoized calculation of events from games
  const events = useMemo(() => {
    const eventMap = new Map<string, Event>()

    // Group games by event
    games.forEach((game) => {
      if (!eventMap.has(game.event_code)) {
        eventMap.set(game.event_code, {
          eventCode: game.event_code,
          eventName: game.event_name,
          games: [],
          startDate: game.game_date,
          endDate: game.game_date,
          performanceRating: 0,
        })
      }

      const event = eventMap.get(game.event_code)!
      event.games.push(game)
      event.startDate = game.game_date < event.startDate ? game.game_date : event.startDate
      event.endDate = game.game_date > event.endDate ? game.game_date : event.endDate
    })

    // Calculate performance rating for each event and sort events by end date
    return Array.from(eventMap.values())
      .map((event) => ({
        ...event,
        performanceRating: calculatePerformanceRating(event.games),
      }))
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  }, [games])

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE)

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE
    const endIndex = startIndex + EVENTS_PER_PAGE
    return events.slice(startIndex, endIndex)
  }, [events, currentPage])

  // Function to toggle the expanded state of an event
  const toggleEvent = (eventCode: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventCode)) {
        newSet.delete(eventCode)
      } else {
        newSet.add(eventCode)
      }
      return newSet
    })
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const getScoreBadge = (score: number) => {
    if (score === 1) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-semibold bg-green-100 text-green-700">1</span>
    if (score === 0) return <span className="inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-semibold bg-red-100 text-red-700">0</span>
    return <span className="inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">½</span>
  }

  return (
    <Card className="card-hover border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Events</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Event</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">Dates</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">Perf.</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">Games</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.map((event) => (
                <React.Fragment key={event.eventCode}>
                  {/* Event row */}
                  <TableRow 
                    className="table-row-hover cursor-pointer"
                    onClick={() => toggleEvent(event.eventCode)}
                  >
                    <TableCell className="py-3 font-medium max-w-[250px] truncate">
                      {event.eventName}
                    </TableCell>
                    <TableCell className="py-3 text-center text-sm text-muted-foreground font-mono-display">
                      {formatDate(event.startDate)}
                      {event.startDate !== event.endDate && (
                        <span> — {formatDate(event.endDate)}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-mono-display font-semibold ${event.games.length < 3 ? "text-muted-foreground" : "text-primary"}`}>
                          {event.performanceRating || "—"}
                        </span>
                        {event.games.length < 3 && event.performanceRating && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">Based on only {event.games.length} game{event.games.length !== 1 ? 's' : ''}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-secondary text-xs font-semibold">
                        {event.games.length}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleEvent(event.eventCode)
                        }} 
                        className="h-7 w-7 p-0 hover:bg-transparent"
                      >
                        {expandedEvents.has(event.eventCode) ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* Expanded game details */}
                  {expandedEvents.has(event.eventCode) && (
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={5} className="p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs text-muted-foreground">Date</TableHead>
                                <TableHead className="text-xs text-muted-foreground">Opponent</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-center">Color</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-center">Score</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-right">Opp. Rating</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-right">Your Rating</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {event.games.map((game, index) => (
                                <TableRow key={index} className="hover:bg-secondary/50">
                                  <TableCell className="py-2 font-mono-display text-sm">{formatDate(game.game_date)}</TableCell>
                                  <TableCell className="py-2">
                                    <Link href={`/player/${game.opponent_no}`} className="link-primary font-medium">
                                      {game.opponent_name}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                      game.colour.toUpperCase() === 'W' 
                                        ? 'bg-white border-2 border-foreground/20 text-foreground' 
                                        : 'bg-foreground text-background'
                                    }`}>
                                      {game.colour.toUpperCase()}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    {getScoreBadge(game.score)}
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono-display text-sm text-muted-foreground">
                                    {game.opponent_rating || '—'}
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono-display text-sm font-medium">
                                    {game.player_rating || '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between items-center mt-6">
          <Button 
            onClick={goToPreviousPage} 
            disabled={currentPage === 1}
            variant="outline"
            className="interactive"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
          <Button 
            onClick={goToNextPage} 
            disabled={currentPage === totalPages}
            variant="outline"
            className="interactive"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
