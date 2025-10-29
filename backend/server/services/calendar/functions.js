/**
 * Calendar Function Declarations for Gemini
 * Defines all calendar-related functions available to the AI assistant
 */

const calendarFunctions = [
    {
        name: 'getCurrentTime',
        description: 'Get the current date and time in the user\'s timezone (retrieved from their Google Calendar settings). ALWAYS call this function when you need to know the current time, date, or to calculate relative times like "tomorrow", "tonight", "next week". This ensures you have the correct timezone and accurate time information.',
        parameters: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'listEvents',
        description: 'Get a list of calendar events from the user\'s Google Calendar. Can search upcoming events or events on a specific date.',
        parameters: {
            type: 'object',
            properties: {
                maxResults: {
                    type: 'integer',
                    description: 'Maximum number of events to return (default 10)'
                },
                daysAhead: {
                    type: 'integer',
                    description: 'Number of days ahead to search from today (default 7). Ignored if specificDate is provided.'
                },
                specificDate: {
                    type: 'string',
                    description: 'Search for events on a specific date in ISO 8601 format (e.g., "2025-10-29"). If provided, searches the entire day from 00:00:00 to 23:59:59.'
                }
            }
        }
    },
    {
        name: 'checkConflicts',
        description: 'Check if a proposed time slot has any scheduling conflicts with existing calendar events. ALWAYS call this BEFORE creating a new event.',
        parameters: {
            type: 'object',
            properties: {
                startTime: {
                    type: 'string',
                    description: 'Proposed event start time in ISO 8601 format (e.g., "2025-10-27T22:00:00")'
                },
                endTime: {
                    type: 'string',
                    description: 'Proposed event end time in ISO 8601 format (e.g., "2025-10-27T23:00:00")'
                },
                eventSummary: {
                    type: 'string',
                    description: 'Brief description of the proposed event for context'
                }
            },
            required: ['startTime', 'endTime']
        }
    },
    {
        name: 'createEvent',
        description: 'Create a new calendar event in the user\'s Google Calendar. Should only be called AFTER checking for conflicts with checkConflicts function.',
        parameters: {
            type: 'object',
            properties: {
                summary: {
                    type: 'string',
                    description: 'Event title/summary (e.g., "Meeting with David")'
                },
                description: {
                    type: 'string',
                    description: 'Event description or additional details'
                },
                startTime: {
                    type: 'string',
                    description: 'Event start time in ISO 8601 format (e.g., "2025-10-27T22:00:00")'
                },
                endTime: {
                    type: 'string',
                    description: 'Event end time in ISO 8601 format (e.g., "2025-10-27T23:00:00")'
                },
                attendees: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of attendee email addresses'
                }
            },
            required: ['summary', 'startTime', 'endTime']
        }
    },
    {
        name: 'createRecurringEvent',
        description: 'Create a recurring event with various patterns (daily, weekly, monthly, etc.)',
        parameters: {
            type: 'object',
            properties: {
                summary: {
                    type: 'string',
                    description: 'Event title/summary'
                },
                description: {
                    type: 'string',
                    description: 'Event description'
                },
                startTime: {
                    type: 'string',
                    description: 'First occurrence start time in ISO 8601 format'
                },
                endTime: {
                    type: 'string',
                    description: 'First occurrence end time in ISO 8601 format'
                },
                recurrencePattern: {
                    type: 'string',
                    description: 'Pattern type: "daily-weekdays" (Mon-Fri), "weekly" (specific days), "biweekly", "monthly-first-monday", "monthly-date", "weekend", "quarterly"'
                },
                days: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'For weekly pattern: ["MO","TU","WE","TH","FR","SA","SU"]'
                },
                until: {
                    type: 'string',
                    description: 'End date in ISO 8601 format (e.g., "2025-12-31T23:59:59")'
                },
                count: {
                    type: 'integer',
                    description: 'Number of occurrences (alternative to until)'
                }
            },
            required: ['summary', 'startTime', 'endTime', 'recurrencePattern']
        }
    },
    {
        name: 'deleteEvent',
        description: 'Delete a single calendar event by its ID. For recurring events, this deletes only ONE instance.',
        parameters: {
            type: 'object',
            properties: {
                eventId: {
                    type: 'string',
                    description: 'The ID of the event to delete'
                }
            },
            required: ['eventId']
        }
    },
    {
        name: 'deleteRecurringEvent',
        description: 'Delete ALL instances of a recurring event series by searching for events matching a title/summary',
        parameters: {
            type: 'object',
            properties: {
                summary: {
                    type: 'string',
                    description: 'Event title/summary to search for (e.g., "Kobra Soiree", "Daily Standup")'
                },
                startDate: {
                    type: 'string',
                    description: 'Start searching from this date (ISO 8601 format, optional - defaults to today)'
                },
                endDate: {
                    type: 'string',
                    description: 'Search until this date (ISO 8601 format, optional - defaults to 2 years from now)'
                }
            },
            required: ['summary']
        }
    },
    {
        name: 'searchAndDeleteEvents',
        description: 'Search for events by title, date, or time range and delete them. Useful for cleaning up multiple events on a specific date or matching a keyword.',
        parameters: {
            type: 'object',
            properties: {
                searchQuery: {
                    type: 'string',
                    description: 'Title/keywords to search for in event names. Use empty string "" to match all events in the date range.'
                },
                startDate: {
                    type: 'string',
                    description: 'Search from this date (ISO 8601 format, e.g., "2025-10-29" for full day or "2025-10-29T10:00:00" for specific time)'
                },
                endDate: {
                    type: 'string',
                    description: 'Search until this date (ISO 8601 format, e.g., "2025-10-29" for end of day or "2025-10-29T23:59:59" for specific time). If searching a single day, set this to the same date as startDate.'
                },
                confirmDelete: {
                    type: 'boolean',
                    description: 'If true, actually delete the events. If false, just list what would be deleted.'
                }
            },
            required: []
        }
    },
    {
        name: 'queryFreeBusy',
        description: 'Check free/busy status for one or more calendars in a time range. Useful for finding available meeting times or checking multiple calendars at once.',
        parameters: {
            type: 'object',
            properties: {
                timeMin: {
                    type: 'string',
                    description: 'Start time in ISO 8601 format (e.g., "2025-10-29T09:00:00")'
                },
                timeMax: {
                    type: 'string',
                    description: 'End time in ISO 8601 format (e.g., "2025-10-29T17:00:00")'
                },
                calendars: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Calendar IDs to query (default: ["primary"])'
                }
            },
            required: ['timeMin', 'timeMax']
        }
    },
    {
        name: 'getEvent',
        description: 'Get detailed information about a specific event by its ID.',
        parameters: {
            type: 'object',
            properties: {
                eventId: {
                    type: 'string',
                    description: 'The ID of the event to retrieve'
                },
                calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: "primary")'
                }
            },
            required: ['eventId']
        }
    },
    {
        name: 'updateEvent',
        description: 'Update an existing event completely (replaces all fields). Use patchEvent to update only specific fields.',
        parameters: {
            type: 'object',
            properties: {
                eventId: {
                    type: 'string',
                    description: 'The ID of the event to update'
                },
                summary: {
                    type: 'string',
                    description: 'New event title/summary'
                },
                description: {
                    type: 'string',
                    description: 'New event description'
                },
                location: {
                    type: 'string',
                    description: 'New event location'
                },
                startTime: {
                    type: 'string',
                    description: 'New start time in ISO 8601 format'
                },
                endTime: {
                    type: 'string',
                    description: 'New end time in ISO 8601 format'
                },
                attendees: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'New list of attendee email addresses'
                },
                calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: "primary")'
                }
            },
            required: ['eventId', 'summary', 'startTime', 'endTime']
        }
    },
    {
        name: 'patchEvent',
        description: 'Partially update an event (only specified fields are changed). More efficient than updateEvent when changing just a few fields.',
        parameters: {
            type: 'object',
            properties: {
                eventId: {
                    type: 'string',
                    description: 'The ID of the event to patch'
                },
                summary: {
                    type: 'string',
                    description: 'New event title (optional)'
                },
                description: {
                    type: 'string',
                    description: 'New description (optional)'
                },
                location: {
                    type: 'string',
                    description: 'New location (optional)'
                },
                startTime: {
                    type: 'string',
                    description: 'New start time in ISO 8601 format (optional)'
                },
                endTime: {
                    type: 'string',
                    description: 'New end time in ISO 8601 format (optional)'
                },
                attendees: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'New attendee list (optional)'
                },
                calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: "primary")'
                }
            },
            required: ['eventId']
        }
    },
    {
        name: 'moveEvent',
        description: 'Move an event from one calendar to another.',
        parameters: {
            type: 'object',
            properties: {
                eventId: {
                    type: 'string',
                    description: 'The ID of the event to move'
                },
                sourceCalendarId: {
                    type: 'string',
                    description: 'Source calendar ID (default: "primary")'
                },
                destinationCalendarId: {
                    type: 'string',
                    description: 'Destination calendar ID (required)'
                }
            },
            required: ['eventId', 'destinationCalendarId']
        }
    },
    {
        name: 'listCalendars',
        description: 'List all calendars accessible to the user.',
        parameters: {
            type: 'object',
            properties: {
                maxResults: {
                    type: 'integer',
                    description: 'Maximum number of calendars to return (default: 50)'
                },
                showHidden: {
                    type: 'boolean',
                    description: 'Include hidden calendars (default: false)'
                }
            }
        }
    },
    {
        name: 'getCalendar',
        description: 'Get metadata about a specific calendar.',
        parameters: {
            type: 'object',
            properties: {
                calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: "primary")'
                }
            }
        }
    },
    {
        name: 'getSettings',
        description: 'Get user calendar settings (timezone, date format, etc.).',
        parameters: {
            type: 'object',
            properties: {
                maxResults: {
                    type: 'integer',
                    description: 'Maximum number of settings to return (default: 50)'
                }
            }
        }
    },
    {
        name: 'getColors',
        description: 'Get available colors for calendars and events.',
        parameters: {
            type: 'object',
            properties: {}
        }
    }
];

module.exports = {
    calendarFunctions
};
