insert into members (name) values
  ('Arnout'), ('Brother'), ('Sister'), ('Child 1'), ('Child 2')
on conflict (name) do nothing;

insert into rooms (name, floor, sort_order)
select * from (values
  ('Living room','Ground floor',10),
  ('Dining room','Ground floor',20),
  ('Kitchen','Ground floor',30),
  ('Garage','Ground floor',40),
  ('Parents bedroom','First floor',50),
  ('Bedroom 2','First floor',60),
  ('Attic','Attic',70)
) as v(name,floor,sort_order)
where not exists (select 1 from rooms);
