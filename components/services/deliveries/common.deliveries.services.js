import Deliveries from '@/models/Deliveries.model';
import Products from '@/models/Products.model'

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    }
  };

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({ _id: req.body.id });
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

const findWithFilters = async (req) => {
  const {
    dateFrom,
    dateTo,
    weight,
    page,
  } = req.body

  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = page ? ((Math.max(0, parseInt(page)) - 1) * limit) : 0;
  let sort = { _id: 1 }
  
  let deliveries = await Deliveries.aggregate([
    { $match: { when: { $gte: new Date(dateFrom), $lt: new Date(dateTo) } } },

    {
      $lookup: {
        from: 'products',
        localField: 'products',
        foreignField: '_id',
        as: 'products'
      },
    },
    {
      $match: {
        "products.weight": {
          $gte: parseInt(weight)
        }
      }

    },
    {
      $facet: {
        paginatedResults: [{ $skip: skip }, { $limit: limit }],
        totalResults: [
          {
            $count: 'count'
          }
        ]
      }
    },

    { $sort: sort },
  ])

  return {
    totalResults: deliveries[0].totalResults[0].count,
    deliveries: deliveries[0].paginatedResults,

  }

}

export default {
  find,
  create,
  findOne,
  findWithFilters
}
