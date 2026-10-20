update public.digital_products
set orderable = false,
    unavailable_reason = 'Replaced by the personalized Athlete Nutrition Guide intake.'
where id in ('muscle-building-nutrition-guide', 'fat-loss-nutrition-guide', 'meal-prep-grocery-guide');
