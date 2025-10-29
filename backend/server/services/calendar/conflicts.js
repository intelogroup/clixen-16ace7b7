/**
 * Calendar Conflict Detection Module
 * Handles scheduling conflict checking and resolution
 */

const { getCalendarClient } = require('./client');

/**
 * Check for scheduling conflicts in a proposed time slot
 * Automatically filters out conflicts from previous years
 * @param {string} userEmail - User email address
 * @param {Object} args - Time slot details
 * @param {string} args.startTime - Proposed start time (ISO 8601)
 * @param {string} args.endTime - Proposed end time (ISO 8601)
 * @param {string} [args.eventSummary] - Optional event description for context
 * @returns {Promise<Object>} Conflict detection results
 */
async function checkConflicts(userEmail, args) {
    try {
        const calendar = await getCalendarClient(userEmail);
        const startTime = new Date(args.startTime);
        const endTime = new Date(args.endTime);
        
        console.log(`   🔍 Checking for conflicts between:`);
        console.log(`      Start: ${startTime.toLocaleString()}`);
        console.log(`      End: ${endTime.toLocaleString()}`);
        
        // Query free/busy information
        const freeBusyResponse = await calendar.freebusy.query({
            requestBody: {
                timeMin: startTime.toISOString(),
                timeMax: endTime.toISOString(),
                items: [{ id: 'primary' }],
            }
        });
        
        const busySlots = freeBusyResponse.data.calendars.primary.busy || [];
        
        if (busySlots.length === 0) {
            console.log(`   ✅ No conflicts found - time slot is FREE`);
            return {
                hasConflicts: false,
                message: 'Time slot is available',
                proposedTime: {
                    start: startTime.toLocaleString('en-US', { 
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    end: endTime.toLocaleString('en-US', { 
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            };
        } else {
            console.log(`   ⚠️  CONFLICTS DETECTED - ${busySlots.length} busy slot(s)`);
            
            // Get details of conflicting events
            const conflictDetails = [];
            const proposedYear = startTime.getFullYear();
            
            for (const slot of busySlots) {
                const slotStart = new Date(slot.start);
                const slotEnd = new Date(slot.end);
                
                // Skip conflicts from different years (e.g., last year's events)
                if (slotStart.getFullYear() !== proposedYear) {
                    console.log(`   ⏭️  Skipping event from ${slotStart.getFullYear()} (different year)`);
                    continue;
                }
                
                // Find events in this time range
                const eventsResponse = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: slot.start,
                    timeMax: slot.end,
                    singleEvents: true,
                    orderBy: 'startTime'
                });
                
                if (eventsResponse.data.items && eventsResponse.data.items.length > 0) {
                    eventsResponse.data.items.forEach(event => {
                        const eventStart = new Date(event.start.dateTime || event.start.date);
                        
                        // Double-check year matches
                        if (eventStart.getFullYear() === proposedYear) {
                            conflictDetails.push({
                                summary: event.summary || 'Busy',
                                id: event.id,
                                start: slotStart.toLocaleString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }),
                                end: slotEnd.toLocaleString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            });
                        }
                    });
                }
            }
            
            console.log(`      Conflicts found: ${conflictDetails.length}`);
            if (conflictDetails.length > 0) {
                console.log(`      Conflict details:`, conflictDetails);
            }
            
            // If no conflicts after filtering by year
            if (conflictDetails.length === 0) {
                console.log(`   ✅ No current conflicts - time slot is FREE (filtered out old year conflicts)`);
                return {
                    hasConflicts: false,
                    message: 'Time slot is available',
                    proposedTime: {
                        start: startTime.toLocaleString('en-US', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        end: endTime.toLocaleString('en-US', { 
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }
                };
            }
            
            return {
                hasConflicts: true,
                conflictCount: conflictDetails.length,
                message: 'Time slot has scheduling conflicts',
                conflicts: conflictDetails,
                proposedTime: {
                    start: startTime.toLocaleString('en-US', { 
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    end: endTime.toLocaleString('en-US', { 
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            };
        }
    } catch (error) {
        console.error('      ❌ Conflict Check Error:', error.message);
        throw new Error(`Failed to check conflicts: ${error.message}`);
    }
}

module.exports = {
    checkConflicts
};
