import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Database online')
  }
  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const total = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(total /limit);


    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          available: true
        }
      }),
      meta: {
        total,
        page,
        lastPage
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({ where: { id, available: true } });

    if(!product) throw new RpcException({
      status: HttpStatus.NOT_FOUND,
      message: `Product with id ${ id } not found`
    });
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    await this.findOne(id);

    return this.product.update({
      where: { id },
      data
    })
  }

  async remove(id: number) {
    await this.findOne(id);
    // return this.product.delete({ where: { id } });

    const product = await this.product.update({
      where: { id },
      data: { 
        available: false 
      }
    })

    return product;
  }

  async validateProducts(ids: number[]) {
    // eliminar posibles ids duplicados
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    if(products.length !== ids.length) throw new RpcException({
      message: 'Some prodcuts were not found',
      status: HttpStatus.BAD_REQUEST
    });

    return products;
  }
}
