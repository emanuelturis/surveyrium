import { gql } from "apollo-server-express";
import {
  IMutationCreateAnswerArgs,
  IMutationUpdateAnswerArgs,
  IMutationDeleteAnswerArgs,
  IMutationReorderAnswersArgs,
} from "../graphql-types";
import { MyContext } from "../my-types";
import { Survey } from "../db/models/Survey";
import { Answer } from "../db/models/Answer";
import { Question } from "../db/models/Question";
import joi from "@hapi/joi";

export const typeDef = gql`
  input ReorderAnswersInput {
    surveyId: ID!
    questionId: ID!
    indexedIds: [IndexedId!]!
    startIndex: Int!
    endIndex: Int!
  }

  extend type Mutation {
    createAnswer(questionId: ID!, surveyId: ID!, order: Int!): Answer!
    updateAnswer(
      id: ID!
      questionId: ID!
      surveyId: ID!
      text: String!
    ): Answer!
    deleteAnswer(id: ID!, questionId: ID!, surveyId: ID!): Boolean!
    reorderAnswers(input: ReorderAnswersInput!): Boolean!
  }
`;

export const resolvers = {
  Mutation: {
    createAnswer: async (
      _: any,
      { questionId, surveyId, order }: IMutationCreateAnswerArgs,
      { user: { id: userId } }: MyContext
    ) => {
      try {
        await joi
          .object({
            questionId: joi.string().required(),
            surveyId: joi.string().required(),
            order: joi.number().required(),
          })
          .validateAsync({
            surveyId,
            questionId,
            order,
          });
      } catch (error) {
        throw error;
      }

      const survey = await Survey.query().findOne({
        userId,
        id: surveyId,
      });

      const question = await survey.$relatedQuery("questions").findOne({
        id: questionId,
      });

      return await Answer.query()
        .insert({
          text: "New Answer",
          questionId: question.id,
          order,
        })
        .returning("*");
    },
    updateAnswer: async (
      _: any,
      { id, questionId, surveyId, text }: IMutationUpdateAnswerArgs,
      { user: { id: userId } }: MyContext
    ): Promise<Answer> => {
      try {
        await joi
          .object({
            id: joi.string().required(),
            surveyId: joi.string().required(),
            questionId: joi.string().required(),
            text: joi.string().required(),
          })
          .validateAsync({
            id,
            questionId,
            surveyId,
            text,
          });
      } catch (error) {
        throw error;
      }

      try {
        const survey = await Survey.query().findOne({
          userId,
          id: surveyId,
        });

        await survey.$relatedQuery("questions").findOne({
          id: questionId,
        });

        return Answer.query()
          .update({
            text,
          })
          .where({
            id,
            questionId,
          })
          .returning("*")
          .first();
      } catch (error) {
        throw error;
      }
    },
    deleteAnswer: async (
      _: any,
      { id, surveyId, questionId }: IMutationDeleteAnswerArgs,
      { user: { id: userId } }: MyContext
    ): Promise<Boolean> => {
      try {
        await joi
          .object({
            id: joi.string().required(),
            surveyId: joi.string().required(),
            questionId: joi.string().required(),
          })
          .validateAsync({
            id,
            surveyId,
            questionId,
          });
      } catch (error) {
        throw error;
      }

      try {
        const survey = await Survey.query().findOne({
          userId,
          id: surveyId,
        });

        await survey.$relatedQuery("questions").findOne({
          id: questionId,
        });

        await Answer.query().delete().where({
          id,
          questionId,
        });

        return true;
      } catch (error) {
        throw error;
      }
    },
    reorderAnswers: async (
      _: any,
      {
        input: { surveyId, questionId, indexedIds, startIndex, endIndex },
      }: IMutationReorderAnswersArgs,
      { user: { id: userId } }: MyContext
    ) => {
      try {
        await joi
          .object({
            input: joi.object({
              startIndex: joi.number().required(),
              endIndex: joi.number().required(),
              indexedIds: joi.array().items(
                joi.object({
                  id: joi.string().required(),
                  index: joi.number().required(),
                })
              ),
              surveyId: joi.string().required(),
              questionId: joi.string().required(),
            }),
          })
          .validateAsync({
            input: {
              startIndex,
              endIndex,
              indexedIds,
              surveyId,
              questionId,
            },
          });
      } catch (error) {
        throw error;
      }

      if (startIndex !== endIndex) {
        const trx = await Answer.startTransaction();

        try {
          const survey = await Survey.query().findOne({
            userId,
            id: surveyId,
          });

          const question = await Question.query().findOne({
            id: questionId,
            surveyId: survey.id,
          });

          indexedIds.map(async (answer) => {
            await Answer.query(trx)
              .update({
                order: answer.index,
              })
              .where("id", answer.id)
              .andWhere("questionId", question.id);

            await trx.commit();

            return true;
          });

          return true;
        } catch (err) {
          await trx.rollback();
          throw err;
        }
      }

      return true;
    },
  },
};
