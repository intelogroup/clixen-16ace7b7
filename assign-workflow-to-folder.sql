-- Helper SQL to assign workflow to user's folder
-- Usage: Replace {workflowId} and {userId} with actual values

-- Get user's assigned folder
SELECT folder_id FROM folder_assignments WHERE user_id = '{userId}';

-- Update workflow with folder tag (n8n uses JSON array for tags)
UPDATE workflow_entity 
SET tags = json_array(
    (SELECT folder_id FROM folder_assignments WHERE user_id = '{userId}')
)
WHERE id = '{workflowId}';

-- Alternative: Add to existing tags
UPDATE workflow_entity 
SET tags = json_insert(
    COALESCE(tags, '[]'), 
    '$[#]', 
    (SELECT folder_id FROM folder_assignments WHERE user_id = '{userId}')
)
WHERE id = '{workflowId}';
