require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpdate() {
  // Get one task
  const { data: task, error } = await supabase.from('wbs_tasks').select('*').not('date_start', 'is', null).limit(1).single();
  if (error) return console.error(error);
  
  console.log("Original Task:");
  console.log({ id: task.id, date_start: task.date_start, date_end: task.date_end, percent_complete: task.percent_complete });

  // Try updating the task with same dates but 60% completion
  const updateData = {
    percent_complete: 60,
    date_start: task.date_start,
    date_end: task.date_end,
    project_id: task.project_id
  };

  const { data: updatedTask, error: updateError } = await supabase
    .from('wbs_tasks')
    .update(updateData)
    .eq('id', task.id)
    .select()
    .single();

  if (updateError) return console.error(updateError);

  console.log("Updated Task:");
  console.log({ id: updatedTask.id, date_start: updatedTask.date_start, date_end: updatedTask.date_end, percent_complete: updatedTask.percent_complete });

  // Revert
  await supabase.from('wbs_tasks').update({ percent_complete: task.percent_complete }).eq('id', task.id);
}

testUpdate();
