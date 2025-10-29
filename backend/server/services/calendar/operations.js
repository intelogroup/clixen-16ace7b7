/**
 * Calendar Operations Module
 * Handles CRUD operations for calendar events
 */

const { getCalendarClient } = require('./client');
const { getCachedTimezone } = require('../cache/timezone');
const { getCachedCalendarQuery, cacheCalendarQuery, invalidateCalendarCache } = require('../cache/calendar');

/**
 * Get current time in user's timezone
 * @param {string} userEmail - User email address
 * @returns {Promise<Object>} Current time information with timezone details
 */
async function getCurrentTime(userEmail) {
    try {
        // Use cached timezone to avoid repeated API calls
        const userTimeZone = await getCachedTimezone(userEmail);
        console.log(`   🌍 User timezone: ${userTimeZone}`);
        
        // Get current time in user's timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimeZone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'long'
        });
        
        const formattedTime = formatter.format(now);
        
        // Also provide ISO format for the user's timezone
        const isoFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = isoFormatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        const second = parts.find(p => p.type === 'second').value;
        
        console.log(`   📅 Current time in ${userTimeZone}: ${formattedTime}`);
        
        return {
            currentTime: now.toISOString(),
            timeZone: userTimeZone,
            localTime: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
            formatted: formattedTime,
            date: {
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day)
            },
            time: {
                hour: parseInt(hour),
                minute: parseInt(minute),
                second: parseInt(second)
            }
        };
    } catch (error) {
        console.error('   ❌ Failed to get current time:', error.message);
        // Fallback to system time
        const now = new Date();
        return {
            currentTime: now.toISOString(),
            timeZone: 'UTC',
            formatted: now.toLocaleString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            }),
            error: 'Using system timezone as fallback'
        };
    }
}

/**
 * List calendar events
 * @param {string} userEmail - User email address
 * @param {Object} args - Query parameters
 * @param {number} [args.maxResults=10] - Maximum number of events to return
 * @param {number} [args.daysAhead=7] - Days ahead to search
 * @param {string} [args.specificDate] - Specific date to search (ISO 8601)
 * @returns {Promise<Object>} Events list with count
 */
async function listEvents(userEmail, args) {
    try {
        // Check cache first
        const cachedResult = getCachedCalendarQuery(userEmail, args);
        if (cachedResult) {
            return cachedResult;
        }
        
        const calendar = await getCalendarClient(userEmail);
        
        let timeMin, timeMax;
        
        // If specificDate is provided, search that entire day
        if (args.specificDate) {
            // Parse date in local timezone to avoid UTC conversion issues
            if (args.specificDate.length === 10) { // Format: YYYY-MM-DD
                const parts = args.specificDate.split('-');
                timeMin = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
                timeMax = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
            } else {
                const specificDate = new Date(args.specificDate);
                timeMin = new Date(specificDate);
                timeMin.setHours(0, 0, 0, 0);
                timeMax = new Date(specificDate);
                timeMax.setHours(23, 59, 59, 999);
            }
            
            console.log(`   📅 Searching specific date: ${args.specificDate}`);
            console.log(`      From: ${timeMin.toLocaleString()} (${timeMin.toISOString()})`);
            console.log(`      To: ${timeMax.toLocaleString()} (${timeMax.toISOString()})`);
        } else {
            // Default behavior: search from now to daysAhead
            const daysAhead = args.daysAhead || 7;
            timeMin = new Date();
            timeMax = new Date();
            timeMax.setDate(timeMax.getDate() + daysAhead);
            
            console.log(`   📅 Searching upcoming events: ${daysAhead} days ahead`);
        }
        
        const listResponse = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: args.maxResults || 10,
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        console.log(`   ✅ Found ${listResponse.data.items?.length || 0} events`);
        
        const result = {
            eventCount: listResponse.data.items?.length || 0,
            events: (listResponse.data.items || []).map(event => ({
                id: event.id,
                summary: event.summary,
                start: event.start.dateTime || event.start.date,
                end: event.end.dateTime || event.end.date,
                description: event.description,
                attendees: event.attendees?.map(a => a.email)
            }))
        };
        
        // Cache the result
        cacheCalendarQuery(userEmail, args, result);
        
        return result;
    } catch (error) {
        console.error('      ❌ Calendar API Error:', error.message);
        throw new Error(`Failed to list events: ${error.message}. Make sure you've run: npm run auth`);
    }
}

/**
 * Create a single calendar event
 * @param {string} userEmail - User email address
 * @param {Object} args - Event details
 * @returns {Promise<Object>} Created event details
 */
async function createEvent(userEmail, args) {
    console.log(`   📅 Creating event for ${userEmail}:`);
    console.log(`      📝 Title: "${args.summary}"`);
    console.log(`      ⏰ Start: ${new Date(args.startTime).toLocaleString()}`);
    console.log(`      ⏱️  End: ${new Date(args.endTime).toLocaleString()}`);
    if (args.description) console.log(`      📄 Description: "${args.description.substring(0, 50)}${args.description.length > 50 ? '...' : ''}"`);
    if (args.attendees?.length) console.log(`      👥 Attendees: ${args.attendees.length}`);
    
    const startTime = Date.now();
    const calendar = await getCalendarClient(userEmail);
    
    const eventResource = {
        summary: args.summary,
        description: args.description,
        start: {
            dateTime: args.startTime,
            timeZone: 'America/New_York'
        },
        end: {
            dateTime: args.endTime,
            timeZone: 'America/New_York'
        }
    };
    
    if (args.attendees && args.attendees.length > 0) {
        eventResource.attendees = args.attendees.map(email => ({ email }));
    }
    
    const createResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventResource
    });
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Event created successfully in ${duration}ms`);
    console.log(`      🆔 Event ID: ${createResponse.data.id}`);
    console.log(`      🔗 Link: ${createResponse.data.htmlLink}`);
    
    // Invalidate cache after creating event
    invalidateCalendarCache(userEmail);
    console.log(`   🗑️ Cache invalidated for ${userEmail}`);
    
    return {
        success: true,
        eventId: createResponse.data.id,
        summary: createResponse.data.summary,
        start: createResponse.data.start.dateTime,
        end: createResponse.data.end.dateTime,
        htmlLink: createResponse.data.htmlLink
    };
}

/**
 * Create a recurring calendar event
 * @param {string} userEmail - User email address
 * @param {Object} args - Event details with recurrence pattern
 * @returns {Promise<Object>} Created recurring event details
 */
async function createRecurringEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   📅 Creating recurring event with pattern: ${args.recurrencePattern}`);
        
        // Build RRULE based on pattern
        let rrule = '';
        
        switch (args.recurrencePattern) {
            case 'daily-weekdays':
                rrule = 'RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR';
                break;
            
            case 'weekly':
                const daysStr = args.days ? args.days.join(',') : 'FR';
                rrule = `RRULE:FREQ=WEEKLY;BYDAY=${daysStr}`;
                break;
            
            case 'biweekly':
                const biweeklyDays = args.days ? args.days.join(',') : 'MO';
                rrule = `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${biweeklyDays}`;
                break;
            
            case 'monthly-first-monday':
                rrule = 'RRULE:FREQ=MONTHLY;BYDAY=1MO';
                break;
            
            case 'monthly-date':
                const startDate = new Date(args.startTime);
                const dayOfMonth = startDate.getDate();
                rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth}`;
                break;
            
            case 'weekend':
                rrule = 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU';
                break;
            
            case 'quarterly':
                rrule = 'RRULE:FREQ=MONTHLY;INTERVAL=3';
                break;
            
            default:
                throw new Error(`Unknown recurrence pattern: ${args.recurrencePattern}`);
        }
        
        // Add UNTIL or COUNT if provided
        if (args.until) {
            const untilDate = new Date(args.until);
            const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            rrule += `;UNTIL=${untilStr}`;
        } else if (args.count) {
            rrule += `;COUNT=${args.count}`;
        }
        
        console.log(`   🔧 Generated RRULE: ${rrule}`);
        
        // Create the recurring event
        const recurringEventResource = {
            summary: args.summary,
            description: args.description,
            start: {
                dateTime: args.startTime,
                timeZone: 'America/New_York'
            },
            end: {
                dateTime: args.endTime,
                timeZone: 'America/New_York'
            },
            recurrence: [rrule]
        };
        
        const recurringResponse = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: recurringEventResource
        });
        
        // Get instances to count
        const instances = await calendar.events.instances({
            calendarId: 'primary',
            eventId: recurringResponse.data.id,
            maxResults: 100
        });
        
        console.log(`   ✅ Created ${instances.data.items.length} instances`);
        
        // Invalidate cache after creating recurring event
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            eventId: recurringResponse.data.id,
            summary: recurringResponse.data.summary,
            pattern: args.recurrencePattern,
            rrule: rrule,
            instanceCount: instances.data.items.length,
            firstOccurrence: recurringResponse.data.start.dateTime,
            htmlLink: recurringResponse.data.htmlLink
        };
    } catch (error) {
        console.error('      ❌ Recurring Event Error:', error.message);
        throw new Error(`Failed to create recurring event: ${error.message}`);
    }
}

/**
 * Delete a single calendar event
 * @param {string} userEmail - User email address
 * @param {Object} args - Event details
 * @param {string} args.eventId - Event ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
async function deleteEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   🗑️  Deleting single event: ${args.eventId}`);
        
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: args.eventId
        });
        
        // Invalidate cache after deleting event
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            message: 'Event deleted successfully',
            eventId: args.eventId
        };
    } catch (error) {
        console.error('      ❌ Delete Error:', error.message);
        throw new Error(`Failed to delete event: ${error.message}`);
    }
}

/**
 * Delete all instances of a recurring event
 * @param {string} userEmail - User email address
 * @param {Object} args - Search criteria
 * @returns {Promise<Object>} Deletion results
 */
async function deleteRecurringEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   🔍 Searching for recurring events: "${args.summary}"`);
        
        // Set search date range
        const searchStart = args.startDate ? new Date(args.startDate) : new Date();
        const searchEnd = args.endDate ? new Date(args.endDate) : new Date();
        searchEnd.setFullYear(searchEnd.getFullYear() + 2); // Default 2 years ahead
        
        // Search for all events matching the summary
        const searchResponse = await calendar.events.list({
            calendarId: 'primary',
            timeMin: searchStart.toISOString(),
            timeMax: searchEnd.toISOString(),
            q: args.summary,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 500
        });
        
        const matchingEvents = searchResponse.data.items || [];
        
        if (matchingEvents.length === 0) {
            console.log(`   ❌ No events found matching "${args.summary}"`);
            return {
                success: false,
                message: `No events found matching "${args.summary}"`,
                deletedCount: 0
            };
        }
        
        console.log(`   🎯 Found ${matchingEvents.length} matching events`);
        
        // Delete all matching events
        let deletedCount = 0;
        const deletedEvents = [];
        
        for (const event of matchingEvents) {
            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: event.id
                });
                deletedCount++;
                deletedEvents.push({
                    summary: event.summary,
                    start: event.start.dateTime || event.start.date
                });
                console.log(`   ✅ Deleted: ${event.summary} (${event.start.dateTime || event.start.date})`);
            } catch (deleteError) {
                console.log(`   ❌ Failed to delete: ${event.id}`);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Invalidate cache after deleting events
        if (deletedCount > 0) {
            invalidateCalendarCache(userEmail);
        }
        
        return {
            success: true,
            message: `Deleted ${deletedCount} instance(s) of "${args.summary}"`,
            deletedCount: deletedCount,
            totalFound: matchingEvents.length,
            deletedEvents: deletedEvents.slice(0, 10) // Return first 10 for confirmation
        };
    } catch (error) {
        console.error('      ❌ Delete Recurring Error:', error.message);
        throw new Error(`Failed to delete recurring events: ${error.message}`);
    }
}

/**
 * Search for events and optionally delete them
 * @param {string} userEmail - User email address
 * @param {Object} args - Search and delete criteria
 * @returns {Promise<Object>} Search/deletion results
 */
async function searchAndDeleteEvents(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   🔍 Searching for events: "${args.searchQuery || 'all events'}"`);
        
        // Set search date range
        let searchStartDate, searchEndDate;
        
        if (args.startDate) {
            // Parse the date and handle timezone properly
            if (args.startDate.length === 10) { // Format: YYYY-MM-DD
                const parts = args.startDate.split('-');
                searchStartDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
            } else {
                searchStartDate = new Date(args.startDate);
            }
        } else {
            searchStartDate = new Date();
        }
        
        if (args.endDate) {
            // Parse the date and handle timezone properly
            if (args.endDate.length === 10) { // Format: YYYY-MM-DD
                const parts = args.endDate.split('-');
                searchEndDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999);
            } else {
                searchEndDate = new Date(args.endDate);
            }
        } else {
            // Default: 1 year ahead if no end date specified
            searchEndDate = new Date(searchStartDate);
            searchEndDate.setFullYear(searchEndDate.getFullYear() + 1);
        }
        
        console.log(`   📅 Date range: ${searchStartDate.toLocaleString()} to ${searchEndDate.toLocaleString()}`);
        console.log(`   📅 ISO format: ${searchStartDate.toISOString()} to ${searchEndDate.toISOString()}`);
        
        // Search for events
        const searchResp = await calendar.events.list({
            calendarId: 'primary',
            timeMin: searchStartDate.toISOString(),
            timeMax: searchEndDate.toISOString(),
            q: args.searchQuery,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 500
        });
        
        const foundEvents = searchResp.data.items || [];
        
        if (foundEvents.length === 0) {
            return {
                success: false,
                message: `No events found matching "${args.searchQuery}"`,
                foundCount: 0,
                preview: []
            };
        }
        
        console.log(`   📋 Found ${foundEvents.length} events`);
        
        // Preview mode - just list what would be deleted
        if (!args.confirmDelete) {
            const preview = foundEvents.map(event => ({
                id: event.id,
                summary: event.summary,
                start: event.start.dateTime || event.start.date,
                end: event.end.dateTime || event.end.date
            }));
            
            console.log(`   👀 Preview mode - not deleting`);
            
            return {
                success: true,
                message: `Found ${foundEvents.length} events matching "${args.searchQuery}". Set confirmDelete=true to delete them.`,
                foundCount: foundEvents.length,
                preview: preview.slice(0, 20), // Show first 20
                needsConfirmation: true
            };
        }
        
        // Actual deletion mode
        console.log(`   🗑️  Deleting ${foundEvents.length} events...`);
        
        let deletedCount = 0;
        const deletedEventsList = [];
        
        for (const event of foundEvents) {
            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: event.id
                });
                deletedCount++;
                deletedEventsList.push({
                    summary: event.summary,
                    start: event.start.dateTime || event.start.date
                });
                console.log(`   ✅ Deleted: ${event.summary}`);
            } catch (deleteError) {
                console.log(`   ❌ Failed: ${event.id}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Invalidate cache after deleting events
        if (deletedCount > 0) {
            invalidateCalendarCache(userEmail);
        }
        
        return {
            success: true,
            message: `Deleted ${deletedCount} out of ${foundEvents.length} events`,
            deletedCount: deletedCount,
            totalFound: foundEvents.length,
            deletedEvents: deletedEventsList.slice(0, 10)
        };
    } catch (error) {
        console.error('      ❌ Search and Delete Error:', error.message);
        throw new Error(`Failed to search and delete events: ${error.message}`);
    }
}

/**
 * Query free/busy information for calendars
 * @param {string} userEmail - User email address
 * @param {Object} args - Query parameters
 * @param {string} args.timeMin - Start time in ISO 8601 format
 * @param {string} args.timeMax - End time in ISO 8601 format
 * @param {Array<string>} [args.calendars=['primary']] - Calendar IDs to query
 * @returns {Promise<Object>} Free/busy information
 */
async function queryFreeBusy(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        const calendars = args.calendars || ['primary'];
        console.log(`   🔍 Querying free/busy for ${calendars.length} calendar(s)...`);
        console.log(`      Time range: ${args.timeMin} to ${args.timeMax}`);
        
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: args.timeMin,
                timeMax: args.timeMax,
                items: calendars.map(id => ({ id }))
            }
        });
        
        const results = {};
        for (const [calId, calData] of Object.entries(response.data.calendars || {})) {
            results[calId] = {
                busy: calData.busy || [],
                errors: calData.errors || []
            };
        }
        
        console.log(`   ✅ Free/busy query complete`);
        
        return {
            timeMin: response.data.timeMin,
            timeMax: response.data.timeMax,
            calendars: results
        };
    } catch (error) {
        console.error('   ❌ Free/Busy Query Error:', error.message);
        throw new Error(`Failed to query free/busy: ${error.message}`);
    }
}

/**
 * Get details of a specific event
 * @param {string} userEmail - User email address
 * @param {Object} args - Event identifier
 * @param {string} args.eventId - Event ID
 * @param {string} [args.calendarId='primary'] - Calendar ID
 * @returns {Promise<Object>} Event details
 */
async function getEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarId = args.calendarId || 'primary';
        
        console.log(`   🔍 Getting event ${args.eventId} from ${calendarId}...`);
        
        const response = await calendar.events.get({
            calendarId: calendarId,
            eventId: args.eventId
        });
        
        console.log(`   ✅ Retrieved event: ${response.data.summary}`);
        
        return {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            start: response.data.start.dateTime || response.data.start.date,
            end: response.data.end.dateTime || response.data.end.date,
            location: response.data.location,
            attendees: response.data.attendees?.map(a => ({
                email: a.email,
                displayName: a.displayName,
                responseStatus: a.responseStatus
            })),
            organizer: response.data.organizer,
            status: response.data.status,
            htmlLink: response.data.htmlLink,
            recurrence: response.data.recurrence,
            recurringEventId: response.data.recurringEventId,
            created: response.data.created,
            updated: response.data.updated
        };
    } catch (error) {
        console.error('   ❌ Get Event Error:', error.message);
        throw new Error(`Failed to get event: ${error.message}`);
    }
}

/**
 * Update an existing event (full replacement)
 * @param {string} userEmail - User email address
 * @param {Object} args - Event details to update
 * @returns {Promise<Object>} Updated event details
 */
async function updateEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarId = args.calendarId || 'primary';
        
        console.log(`   📝 Updating event ${args.eventId}...`);
        
        const eventResource = {
            summary: args.summary,
            description: args.description,
            location: args.location,
            start: {
                dateTime: args.startTime,
                timeZone: args.timeZone || 'America/New_York'
            },
            end: {
                dateTime: args.endTime,
                timeZone: args.timeZone || 'America/New_York'
            }
        };
        
        if (args.attendees && args.attendees.length > 0) {
            eventResource.attendees = args.attendees.map(email => ({ email }));
        }
        
        const response = await calendar.events.update({
            calendarId: calendarId,
            eventId: args.eventId,
            requestBody: eventResource
        });
        
        console.log(`   ✅ Event updated successfully`);
        
        // Invalidate cache after update
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            eventId: response.data.id,
            summary: response.data.summary,
            start: response.data.start.dateTime || response.data.start.date,
            end: response.data.end.dateTime || response.data.end.date,
            htmlLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('   ❌ Update Event Error:', error.message);
        throw new Error(`Failed to update event: ${error.message}`);
    }
}

/**
 * Partially update an event (only specified fields)
 * @param {string} userEmail - User email address
 * @param {Object} args - Event fields to patch
 * @returns {Promise<Object>} Patched event details
 */
async function patchEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarId = args.calendarId || 'primary';
        
        console.log(`   🔧 Patching event ${args.eventId}...`);
        
        // Build patch object with only provided fields
        const patchData = {};
        if (args.summary !== undefined) patchData.summary = args.summary;
        if (args.description !== undefined) patchData.description = args.description;
        if (args.location !== undefined) patchData.location = args.location;
        
        if (args.startTime) {
            patchData.start = {
                dateTime: args.startTime,
                timeZone: args.timeZone || 'America/New_York'
            };
        }
        
        if (args.endTime) {
            patchData.end = {
                dateTime: args.endTime,
                timeZone: args.timeZone || 'America/New_York'
            };
        }
        
        if (args.attendees) {
            patchData.attendees = args.attendees.map(email => ({ email }));
        }
        
        const response = await calendar.events.patch({
            calendarId: calendarId,
            eventId: args.eventId,
            requestBody: patchData
        });
        
        console.log(`   ✅ Event patched successfully`);
        
        // Invalidate cache after patch
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            eventId: response.data.id,
            summary: response.data.summary,
            updated: response.data.updated,
            htmlLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('   ❌ Patch Event Error:', error.message);
        throw new Error(`Failed to patch event: ${error.message}`);
    }
}

/**
 * Move an event to another calendar
 * @param {string} userEmail - User email address
 * @param {Object} args - Move parameters
 * @returns {Promise<Object>} Moved event details
 */
async function moveEvent(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const sourceCalendarId = args.sourceCalendarId || 'primary';
        const destinationCalendarId = args.destinationCalendarId;
        
        if (!destinationCalendarId) {
            throw new Error('destinationCalendarId is required');
        }
        
        console.log(`   📦 Moving event ${args.eventId} from ${sourceCalendarId} to ${destinationCalendarId}...`);
        
        const response = await calendar.events.move({
            calendarId: sourceCalendarId,
            eventId: args.eventId,
            destination: destinationCalendarId
        });
        
        console.log(`   ✅ Event moved successfully`);
        
        // Invalidate cache for both calendars
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            eventId: response.data.id,
            summary: response.data.summary,
            oldCalendar: sourceCalendarId,
            newCalendar: destinationCalendarId,
            htmlLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('   ❌ Move Event Error:', error.message);
        throw new Error(`Failed to move event: ${error.message}`);
    }
}

/**
 * Get calendar metadata
 * @param {string} userEmail - User email address
 * @param {Object} args - Calendar identifier
 * @param {string} [args.calendarId='primary'] - Calendar ID
 * @returns {Promise<Object>} Calendar metadata
 */
async function getCalendar(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarId = args.calendarId || 'primary';
        
        console.log(`   📅 Getting calendar metadata for ${calendarId}...`);
        
        const response = await calendar.calendars.get({
            calendarId: calendarId
        });
        
        console.log(`   ✅ Retrieved calendar: ${response.data.summary}`);
        
        return {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            location: response.data.location,
            timeZone: response.data.timeZone,
            conferenceProperties: response.data.conferenceProperties
        };
    } catch (error) {
        console.error('   ❌ Get Calendar Error:', error.message);
        throw new Error(`Failed to get calendar: ${error.message}`);
    }
}

/**
 * Create a new calendar
 * @param {string} userEmail - User email address
 * @param {Object} args - Calendar details
 * @returns {Promise<Object>} Created calendar details
 */
async function createCalendar(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   📅 Creating new calendar: ${args.summary}...`);
        
        const calendarResource = {
            summary: args.summary,
            description: args.description,
            location: args.location,
            timeZone: args.timeZone || 'America/New_York'
        };
        
        const response = await calendar.calendars.insert({
            requestBody: calendarResource
        });
        
        console.log(`   ✅ Calendar created: ${response.data.id}`);
        
        return {
            success: true,
            calendarId: response.data.id,
            summary: response.data.summary,
            timeZone: response.data.timeZone
        };
    } catch (error) {
        console.error('   ❌ Create Calendar Error:', error.message);
        throw new Error(`Failed to create calendar: ${error.message}`);
    }
}

/**
 * Update calendar properties
 * @param {string} userEmail - User email address
 * @param {Object} args - Calendar update details
 * @returns {Promise<Object>} Updated calendar details
 */
async function updateCalendar(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   📝 Updating calendar ${args.calendarId}...`);
        
        const calendarResource = {
            summary: args.summary,
            description: args.description,
            location: args.location,
            timeZone: args.timeZone
        };
        
        const response = await calendar.calendars.update({
            calendarId: args.calendarId,
            requestBody: calendarResource
        });
        
        console.log(`   ✅ Calendar updated successfully`);
        
        return {
            success: true,
            calendarId: response.data.id,
            summary: response.data.summary
        };
    } catch (error) {
        console.error('   ❌ Update Calendar Error:', error.message);
        throw new Error(`Failed to update calendar: ${error.message}`);
    }
}

/**
 * Delete a calendar
 * @param {string} userEmail - User email address
 * @param {Object} args - Calendar identifier
 * @returns {Promise<Object>} Deletion confirmation
 */
async function deleteCalendar(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        if (args.calendarId === 'primary') {
            throw new Error('Cannot delete primary calendar');
        }
        
        console.log(`   🗑️  Deleting calendar ${args.calendarId}...`);
        
        await calendar.calendars.delete({
            calendarId: args.calendarId
        });
        
        console.log(`   ✅ Calendar deleted successfully`);
        
        return {
            success: true,
            message: 'Calendar deleted',
            calendarId: args.calendarId
        };
    } catch (error) {
        console.error('   ❌ Delete Calendar Error:', error.message);
        throw new Error(`Failed to delete calendar: ${error.message}`);
    }
}

/**
 * Clear all events from a calendar
 * @param {string} userEmail - User email address
 * @param {Object} args - Calendar identifier
 * @returns {Promise<Object>} Clear confirmation
 */
async function clearCalendar(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const calendarId = args.calendarId || 'primary';
        
        console.log(`   🗑️  Clearing all events from ${calendarId}...`);
        
        await calendar.calendars.clear({
            calendarId: calendarId
        });
        
        console.log(`   ✅ Calendar cleared successfully`);
        
        // Invalidate cache
        invalidateCalendarCache(userEmail);
        
        return {
            success: true,
            message: 'All events cleared from calendar',
            calendarId: calendarId
        };
    } catch (error) {
        console.error('   ❌ Clear Calendar Error:', error.message);
        throw new Error(`Failed to clear calendar: ${error.message}`);
    }
}

/**
 * List all user calendars
 * @param {string} userEmail - User email address
 * @param {Object} args - Query parameters
 * @returns {Promise<Object>} List of calendars
 */
async function listCalendars(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   📋 Listing calendars...`);
        
        const response = await calendar.calendarList.list({
            maxResults: args.maxResults || 50,
            showHidden: args.showHidden || false
        });
        
        const calendars = (response.data.items || []).map(cal => ({
            id: cal.id,
            summary: cal.summary,
            description: cal.description,
            timeZone: cal.timeZone,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            accessRole: cal.accessRole,
            primary: cal.primary || false
        }));
        
        console.log(`   ✅ Found ${calendars.length} calendars`);
        
        return {
            count: calendars.length,
            calendars: calendars
        };
    } catch (error) {
        console.error('   ❌ List Calendars Error:', error.message);
        throw new Error(`Failed to list calendars: ${error.message}`);
    }
}

/**
 * Get user calendar settings
 * @param {string} userEmail - User email address
 * @param {Object} args - Query parameters
 * @returns {Promise<Object>} Calendar settings
 */
async function getSettings(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   ⚙️  Getting calendar settings...`);
        
        const response = await calendar.settings.list({
            maxResults: args.maxResults || 50
        });
        
        const settings = {};
        (response.data.items || []).forEach(item => {
            settings[item.id] = item.value;
        });
        
        console.log(`   ✅ Retrieved ${Object.keys(settings).length} settings`);
        
        return {
            settings: settings
        };
    } catch (error) {
        console.error('   ❌ Get Settings Error:', error.message);
        throw new Error(`Failed to get settings: ${error.message}`);
    }
}

/**
 * Get calendar color palette
 * @param {string} userEmail - User email address
 * @returns {Promise<Object>} Color definitions
 */
async function getColors(userEmail) {
    try {
        const calendar = await getCalendarClient(userEmail);
        
        console.log(`   🎨 Getting calendar colors...`);
        
        const response = await calendar.colors.get();
        
        console.log(`   ✅ Retrieved color palette`);
        
        return {
            calendarColors: response.data.calendar || {},
            eventColors: response.data.event || {}
        };
    } catch (error) {
        console.error('   ❌ Get Colors Error:', error.message);
        throw new Error(`Failed to get colors: ${error.message}`);
    }
}

module.exports = {
    getCurrentTime,
    listEvents,
    createEvent,
    createRecurringEvent,
    deleteEvent,
    deleteRecurringEvent,
    searchAndDeleteEvents,
    queryFreeBusy,
    getEvent,
    updateEvent,
    patchEvent,
    moveEvent,
    getCalendar,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    clearCalendar,
    listCalendars,
    getSettings,
    getColors
};
