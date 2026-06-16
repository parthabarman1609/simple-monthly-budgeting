create or replace function user_expense_summary(uid uuid, start_date date, end_date date)
returns table (
    total_spent numeric,
    total_owed numeric
)
as $$
begin
    return query
    select
        sum(e.amount),
        sum(s.amount_owed)
    from expenses e
    left join expense_splits s on e.id = s.expense_id
    where e.payer_id = uid
    and e.date between start_date and end_date;
end;
$$ language plpgsql;