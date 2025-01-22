import React from "react"
import { useState, useMemo } from "react"
import { formatDate, calculatePerformanceRating } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

export default function EventList({ games }: EventListProps) {
  // State to keep track of which events are expanded
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

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

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full bg-white border border-gray-300">
        <TableHeader>
          <TableRow className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            <TableHead className="py-3 px-6 text-left">Event Name</TableHead>
            <TableHead className="py-3 px-6 text-left">Start Date</TableHead>
            <TableHead className="py-3 px-6 text-left">End Date</TableHead>
            <TableHead className="py-3 px-6 text-left">Performance Rating</TableHead>
            <TableHead className="py-3 px-6 text-left">Games</TableHead>
            <TableHead className="py-3 px-6 text-left"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <React.Fragment key={event.eventCode}>
              {/* Event row */}
              <TableRow className="border-b border-gray-200 hover:bg-gray-100">
                <TableCell className="py-3 px-6 text-left whitespace-nowrap">{event.eventName}</TableCell>
                <TableCell className="py-3 px-6 text-left">{formatDate(event.startDate)}</TableCell>
                <TableCell className="py-3 px-6 text-left">{formatDate(event.endDate)}</TableCell>
                <TableCell className="py-3 px-6 text-left">
                  <span className={event.games.length < 3 ? "text-gray-500" : ""}>{event.performanceRating}</span>
                  {/* Show tooltip for unreliable performance ratings */}
                  {event.games.length < 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="inline-block ml-1 h-4 w-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Events with very low numbers of games can lead to unreliable performance ratings</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                <TableCell className="py-3 px-6 text-left">{event.games.length}</TableCell>
                <TableCell className="py-3 px-6 text-left">
                  <Button variant="ghost" size="sm" onClick={() => toggleEvent(event.eventCode)} className="p-1">
                    {expandedEvents.has(event.eventCode) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
              {/* Expanded game details */}
              {expandedEvents.has(event.eventCode) && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="bg-gray-100 text-gray-600 text-sm leading-normal">
                          <TableHead className="py-2 px-4 text-left">Date</TableHead>
                          <TableHead className="py-2 px-4 text-left">Opponent</TableHead>
                          <TableHead className="py-2 px-4 text-left">Color</TableHead>
                          <TableHead className="py-2 px-4 text-left">Score</TableHead>
                          <TableHead className="py-2 px-4 text-left">Opponent Rating</TableHead>
                          <TableHead className="py-2 px-4 text-left">Player Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.games.map((game, index) => (
                          <TableRow key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell className="py-2 px-4 text-left">{formatDate(game.game_date)}</TableCell>
                            <TableCell className="py-2 px-4 text-left">
                              <Link href={`/player/${game.opponent_no}`} className="text-blue-600 hover:underline">
                                {game.opponent_name}
                              </Link>
                            </TableCell>
                            <TableCell className="py-2 px-4 text-left">{game.colour}</TableCell>
                            <TableCell className="py-2 px-4 text-left">{game.score === 5 ? "½" : game.score}</TableCell>
                            <TableCell className="py-2 px-4 text-left">{game.opponent_rating}</TableCell>
                            <TableCell className="py-2 px-4 text-left">{game.player_rating}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

