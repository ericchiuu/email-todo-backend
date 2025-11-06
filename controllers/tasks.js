const express = require('express');
const supabase = require('../utils/supabase');

const router = express.Router();

// Get all tasks for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    res.json({ tasks: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark task as complete
router.patch('/:taskId/complete', async (req, res) => {
  const { taskId } = req.params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: true })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    res.json({ task: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;