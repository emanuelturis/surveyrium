import React from "react";
import { Form, Button } from "react-bootstrap";
import { IQuestion } from "../../graphql-types";
import { Formik, Field, Form as FormikForm, ErrorMessage } from "formik";
import * as yup from "yup";
import { IActions } from "../Question/Question";
import { FormControl, SubmitButton } from "../Shared/Form";

interface Props {
  question: IQuestion;
  actions: IActions;
}

const TextQuestion = ({
  question,
  actions: { step, steps, setStep, setSubmission },
}: Props) => {
  const textQuestionValidationSchema = yup.object().shape({
    [question.id]: yup
      .string()
      .required("You must answer this question to continue!"),
  });

  return (
    <Formik
      initialValues={{
        [question.id]: "",
      }}
      onSubmit={(values) => {
        setSubmission([
          {
            questionId: question.id,
            answerText: values[question.id],
            answerId: null,
          },
        ]);
      }}
      validationSchema={textQuestionValidationSchema}
    >
      <FormikForm>
        <h3>{question.text}</h3>
        <FormControl as={Field} type="text" name={question.id} />
        <ErrorMessage
          component="p"
          className="text-danger"
          name={question.id}
        />
        <SubmitButton type="submit">
          {step === steps ? "Finish Survey" : "Next Question"}
        </SubmitButton>
      </FormikForm>
    </Formik>
  );
};

export default TextQuestion;
