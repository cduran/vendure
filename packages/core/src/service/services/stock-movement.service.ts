import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { StockMovementListOptions } from '@vendure/common/lib/generated-types';
import { Connection } from 'typeorm';

import { ID, PaginatedList } from '../../../../common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { ShippingCalculator } from '../../config/shipping-method/shipping-calculator';
import { ShippingEligibilityChecker } from '../../config/shipping-method/shipping-eligibility-checker';
import { ProductVariant } from '../../entity/product-variant/product-variant.entity';
import { ShippingMethod } from '../../entity/shipping-method/shipping-method.entity';
import { StockAdjustment } from '../../entity/stock-movement/stock-adjustment.entity';
import { StockMovement } from '../../entity/stock-movement/stock-movement.entity';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';

@Injectable()
export class StockMovementService {
    shippingEligibilityCheckers: ShippingEligibilityChecker[];
    shippingCalculators: ShippingCalculator[];
    private activeShippingMethods: ShippingMethod[];

    constructor(
        @InjectConnection() private connection: Connection,
        private listQueryBuilder: ListQueryBuilder,
    ) {}

    getStockMovementsByProductVariantId(
        ctx: RequestContext,
        productVariantId: ID,
        options: StockMovementListOptions,
    ): Promise<PaginatedList<StockMovement>> {
        return this.listQueryBuilder
            .build<StockMovement>(StockMovement as any, options)
            .leftJoin('stockmovement.productVariant', 'productVariant')
            .andWhere('productVariant.id = :productVariantId', { productVariantId })
            .getManyAndCount()
            .then(async ([items, totalItems]) => {
                return {
                    items,
                    totalItems,
                };
            });
    }

    async adjustProductVariantStock(variant: ProductVariant, newStockLevel: number): Promise<StockAdjustment | undefined> {
        if (variant.stockOnHand === newStockLevel) {
            return;
        }
        const delta = newStockLevel - variant.stockOnHand;

        const adjustment = new StockAdjustment({
            quantity: delta,
            productVariant: variant,
        });
        return this.connection.getRepository(StockAdjustment).save(adjustment);
    }
}