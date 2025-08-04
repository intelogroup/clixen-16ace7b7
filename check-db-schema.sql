-- Check if conversations table exists and its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- Check if ai_chat_messages table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'ai_chat_messages'
);

-- Check if ai_chat_sessions table exists  
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'ai_chat_sessions'
);
EOF < /dev/null
