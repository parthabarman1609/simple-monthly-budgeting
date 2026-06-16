alter table expenses enable row level security;
alter table expense_splits enable row level security;

-- Users can see only their expenses OR group expenses
create policy "Users can view own expenses"
on expenses
for select
using (
    payer_id = auth.uid()
    OR group_id IN (
        select group_id from group_members where user_id = auth.uid()
    )
);

-- Splits visibility
create policy "Users can view splits"
on expense_splits
for select
using (user_id = auth.uid());