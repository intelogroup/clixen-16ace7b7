/**
 * Calendar Service Module
 * Main entry point for all calendar-related functionality
 */

const { getCalendarClient, generateAuthUrl, handleOAuthCallback, hasCredentials, revokeAccess } = require('./client');
const { calendarFunctions } = require('./functions');
const { 
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
} = require('./operations');
const { checkConflicts } = require('./conflicts');
const { analyzeFunctionDependencies, executeParallelFunctions } = require('./parallel');

/**
 * Execute a single calendar function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments
 * @param {string} userEmail - User email for authentication
 * @returns {Promise<any>} Function result
 */
async function executeFunction(functionName, args, userEmail) {
    console.log(`   🔧 Executing: ${functionName}(${JSON.stringify(args, null, 2)}) for user: ${userEmail}`);
    
    if (!userEmail) {
        throw new Error('User email required for calendar operations');
    }
    
    switch (functionName) {
        case 'getCurrentTime':
            return await getCurrentTime(userEmail);
            
        case 'listEvents':
            return await listEvents(userEmail, args);
            
        case 'checkConflicts':
            return await checkConflicts(userEmail, args);
            
        case 'createEvent':
            return await createEvent(userEmail, args);
            
        case 'createRecurringEvent':
            return await createRecurringEvent(userEmail, args);
            
        case 'deleteEvent':
            return await deleteEvent(userEmail, args);
            
        case 'deleteRecurringEvent':
            return await deleteRecurringEvent(userEmail, args);
            
        case 'searchAndDeleteEvents':
            return await searchAndDeleteEvents(userEmail, args);
            
        case 'queryFreeBusy':
            return await queryFreeBusy(userEmail, args);
            
        case 'getEvent':
            return await getEvent(userEmail, args);
            
        case 'updateEvent':
            return await updateEvent(userEmail, args);
            
        case 'patchEvent':
            return await patchEvent(userEmail, args);
            
        case 'moveEvent':
            return await moveEvent(userEmail, args);
            
        case 'getCalendar':
            return await getCalendar(userEmail, args);
            
        case 'createCalendar':
            return await createCalendar(userEmail, args);
            
        case 'updateCalendar':
            return await updateCalendar(userEmail, args);
            
        case 'deleteCalendar':
            return await deleteCalendar(userEmail, args);
            
        case 'clearCalendar':
            return await clearCalendar(userEmail, args);
            
        case 'listCalendars':
            return await listCalendars(userEmail, args);
            
        case 'getSettings':
            return await getSettings(userEmail, args);
            
        case 'getColors':
            return await getColors(userEmail);
            
        default:
            throw new Error(`Unknown function: ${functionName}`);
    }
}

module.exports = {
    // Client functions
    getCalendarClient,
    generateAuthUrl,
    handleOAuthCallback,
    hasCredentials,
    revokeAccess,
    
    // Function declarations
    calendarFunctions,
    
    // Operations
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
    getColors,
    
    // Conflict checking
    checkConflicts,
    
    // Parallel execution
    analyzeFunctionDependencies,
    executeParallelFunctions,
    executeFunction
};
