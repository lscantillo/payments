# frozen_string_literal: true

products = [
  {
    id: 'prod-1',
    name: 'Taza de cerámica Aurora',
    description: 'Gres esmaltado a mano, apto para uso diario. Cada pieza varía un poco en el borde.',
    image_url: '/products/aurora.svg',
    price_in_cents: 8_900_000,
    currency: 'COP',
    stock: 5
  },
  {
    id: 'prod-2',
    name: 'Plato hondo Siena',
    description: 'Plato hondo de gres rojo con borde irregular y esmalte mate. Sirve para pasta o ensalada.',
    image_url: '/products/siena.svg',
    price_in_cents: 12_400_000,
    currency: 'COP',
    stock: 3
  },
  {
    id: 'prod-3',
    name: 'Jarra Litoral',
    description: 'Jarra de un litro con asa gruesa. El vidriado verde cambia de tono con la luz.',
    image_url: '/products/litoral.svg',
    price_in_cents: 15_600_000,
    currency: 'COP',
    stock: 2
  },
  {
    id: 'prod-4',
    name: 'Bowl Nube',
    description: 'Bowl bajo para el desayuno. Interior blanco y exterior del color de la arena.',
    image_url: '/products/nube.svg',
    price_in_cents: 7_200_000,
    currency: 'COP',
    stock: 8
  }
]

products.each do |attrs|
  record = Persistence::ProductRecord.find_by(id: attrs[:id])
  if record
    record.update!(attrs.except(:stock))
  else
    Persistence::ProductRecord.create!(attrs)
  end
end
